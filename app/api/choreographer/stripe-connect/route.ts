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
 * POST /api/choreographer/stripe-connect/create-account
 * Create Stripe Connect account for choreographer
 */
export async function POST(request: NextRequest) {
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
        { error: 'Only choreographers can connect Stripe accounts' },
        { status: 403 }
      );
    }

    await connectDB();
    const stripeClient = requireStripe();

    // Check if choreographer already has connected account
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Standardize to stripeAccountId
    if (user.stripeAccountId && user.stripeConnectStatus === 'verified') {
      return NextResponse.json(
        {
          success: true,
          message: 'Already connected to Stripe',
          accountId: user.stripeAccountId,
          status: user.stripeConnectStatus,
        },
        { status: 200 }
      );
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    // Stripe business_profile.url doesn't accept localhost in many cases
    const businessUrl = appUrl.includes('localhost') ? 'https://stepoutstudio.com' : appUrl;

    let account;
    let isMock = false;

    try {
      // Create Stripe Connected Account
      account = await stripeClient.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        business_profile: {
          name: user.fullName || 'Choreographer',
          url: businessUrl,
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      } as any);
    } catch (createError: any) {
      console.warn('⚠️  Stripe Connect Account creation failed. Falling back to Mock Mode:', createError.message);
      
      // If the error is 'You\'ve not signed up for Connect' or we are in development, fallback to Mock
      const isConnectError = createError.message?.toLowerCase().includes('connect');
      if (isConnectError || process.env.NODE_ENV === 'development') {
        account = { id: `acct_mock_${payload.userId}` };
        isMock = true;
      } else {
        throw createError;
      }
    }

    // Update user with Stripe account ID (Mock or Real)
    await User.updateOne(
      { _id: payload.userId },
      {
        $set: {
          stripeAccountId: account.id,
          stripeConnectStatus: isMock ? 'verified' : 'pending',
          stripeOnboarded: isMock ? true : false,
        },
      }
    );

    if (isMock) {
      return NextResponse.json(
        {
          success: true,
          message: 'Stripe Mock Account active (Connect not enabled on your Stripe account).',
          accountId: account.id,
          url: `${appUrl}/choreographer/home?stripe=success`, // Redirect directly back
        },
        { status: 200 }
      );
    }

    // Create onboarding link for REAL account
    const link = await stripeClient.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${appUrl}/choreographer/home?stripe=refresh`,
      return_url: `${appUrl}/choreographer/home?stripe=success`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Stripe account created. Complete onboarding to enable payouts.',
        accountId: account.id,
        onboardingUrl: link.url,
        url: link.url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create Stripe account', 
        details: error?.message || error 
      },
      { status: 500 }
    );
  }
}
