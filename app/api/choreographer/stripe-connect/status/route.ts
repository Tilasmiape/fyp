import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requireStripe } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export const runtime = 'nodejs';

/**
 * GET /api/choreographer/stripe-connect/status
 * Check Stripe Connect status for choreographer
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'choreographer') {
      return NextResponse.json(
        { error: 'Only choreographers can check Stripe status' },
        { status: 403 }
      );
    }

    await connectDB();
    const stripeClient = requireStripe();

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Standardize to stripeAccountId (as per models/User.ts)
    const stripeAccountId = user.stripeAccountId || (user as any).stripeConnectAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          success: true,
          connected: false,
          onboarded: false,
          message: 'Not connected to Stripe',
        },
        { status: 200 }
      );
    }

    // --- MOCK MODE CHECK ---
    if (stripeAccountId.startsWith('acct_mock_')) {
      return NextResponse.json(
        {
          success: true,
          connected: true,
          onboarded: true,
          status: 'verified',
          chargesEnabled: true,
          payoutsEnabled: true,
          accountId: stripeAccountId,
        },
        { status: 200 }
      );
    }
    // -----------------------

    // Check account status with Stripe
    const account = await stripeClient.accounts.retrieve(stripeAccountId as string);

    // Update user status based on Stripe state
    const stripeStatus = account.charges_enabled ? 'verified' : 'restricted';
    const hasSubmittedDetails = account.details_submitted;

    if (user.stripeConnectStatus !== stripeStatus || user.stripeAccountId !== stripeAccountId) {
      await User.updateOne(
        { _id: payload.userId },
        { 
          $set: { 
            stripeConnectStatus: stripeStatus,
            stripeAccountId: stripeAccountId // Ensure it's saved in the correct field
          } 
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        connected: true,
        onboarded: hasSubmittedDetails,
        status: stripeStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        accountId: stripeAccountId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking Stripe status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check Stripe status', 
        details: error?.message || error 
      },
      { status: 500 }
    );
  }
}
