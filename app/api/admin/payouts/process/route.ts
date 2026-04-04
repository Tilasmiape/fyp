import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { requireStripe, createTransferToChoreo } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export const runtime = 'nodejs';

/**
 * POST /api/admin/payouts/process
 * Process scheduled payouts for choreographers (Friday payout run)
 * Only super-admin or admin can trigger this
 * 
 * Authentication:
 * 1. Cookie: authToken (user-based)
 * 2. Header: X-Admin-Key (for cron jobs / external services)
 */
export async function POST(request: NextRequest) {
  try {
    let isAuthorized = false;
    
    // Method 1: Cookie-based auth (for UI)
    const token = request.cookies.get('authToken')?.value;
    let payload: AuthPayload | null = null;

    if (token) {
      try {
        payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        if (payload.role === 'super-admin') {
          isAuthorized = true;
        }
      } catch {
        // Token invalid, try API key
      }
    }

    // Method 2: API key auth (for cron jobs / external services)
    if (!isAuthorized) {
      const adminKey = request.headers.get('x-admin-key');
      const validAdminKey = process.env.ADMIN_API_KEY || '';

      if (adminKey && validAdminKey && adminKey === validAdminKey) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const stripeClient = requireStripe();

    // Find all payouts that are scheduled and past their payout date
    const payouts = await Payout.find({
      status: 'pending',
      payoutDate: { $lte: new Date() },
    })
      .populate('choreographerId', 'fullName stripeConnectAccountId email')
      .populate('sessionId');

    if (payouts.length === 0) {
      return NextResponse.json(
        { message: 'No payouts to process', processed: 0 },
        { status: 200 }
      );
    }

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const payout of payouts) {
      try {
        const choreographer = payout.choreographerId as any;

        // Verify choreographer has connected Stripe account
        if (!choreographer.stripeConnectAccountId) {
          await Payout.updateOne(
            { _id: payout._id },
            {
              $set: {
                status: 'failed',
                errorMessage: 'Choreographer has no Stripe connected account',
              },
            }
          );
          failed++;
          results.push({
            payoutId: payout._id,
            status: 'failed',
            reason: 'No Stripe connected account',
          });
          continue;
        }


        // Always pay 88% of session total (choreographerEarnings)
        const session = payout.sessionId as any;
        const choreographerEarnings = session.choreographerEarnings || Math.round(session.total * 0.88 * 100) / 100;
        const amountInCents = Math.round(choreographerEarnings * 100);

        const transfer = await createTransferToChoreo(
          stripeClient,
          choreographer.stripeConnectAccountId,
          amountInCents,
          payout.currency,
          {
            payoutId: payout._id.toString(),
            choreographerId: choreographer._id.toString(),
            sessionId: payout.sessionId.toString(),
            choreographerEmail: choreographer.email,
          }
        );

        // Update payout record
        await Payout.updateOne(
          { _id: payout._id },
          {
            $set: {
              status: 'completed',
              stripeTransferId: transfer.id,
              processedAt: new Date(),
            },
          }
        );

        // Update session payout status
        const session_id = payout.sessionId;
        await Session.updateOne(
          { _id: session_id },
          {
            $set: {
              payoutStatus: 'completed',
            },
          }
        );

        // Update choreographer total earnings
        await User.updateOne(
          { _id: choreographer._id },
          {
            $inc: {
              totalPayoutsReceived: payout.amount,
            },
          }
        );

        processed++;
        results.push({
          payoutId: payout._id,
          choreographerId: choreographer._id,
          status: 'completed',
          stripeTransferId: transfer.id,
          amount: payout.amount,
        });
      } catch (error: any) {
        failed++;
        const errorMessage = error?.message || 'Unknown error';
        await Payout.updateOne(
          { _id: payout._id },
          {
            $set: {
              status: 'failed',
              errorMessage,
            },
          }
        );
        results.push({
          payoutId: payout._id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Payout processing complete',
        summary: {
          total: payouts.length,
          processed,
          failed,
        },
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Payout processing error:', error);
    return NextResponse.json(
      { error: 'Payout processing failed', details: error?.message || error },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/payouts/status
 * Get payout statistics
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

    if (payload.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Only admins can view payout status' },
        { status: 403 }
      );
    }

    await connectDB();

    const today = new Date();

    const stats = {
      pending: await Payout.countDocuments({ status: 'pending' }),
      processing: await Payout.countDocuments({ status: 'processing' }),
      completed: await Payout.countDocuments({ status: 'completed' }),
      failed: await Payout.countDocuments({ status: 'failed' }),
      totalPending: await Payout.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      nextPayoutRun: new Date(today.getTime() + ((5 - today.getDay() + 7) % 7 || 7) * 24 * 60 * 60 * 1000),
    };

    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payout status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout status', details: error?.message || error },
      { status: 500 }
    );
  }
}
