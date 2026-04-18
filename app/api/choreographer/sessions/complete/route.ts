import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { calculatePayoutSplit, getNextFriday } from '@/lib/stripe';
import { upsertPaymentFromSession } from '@/lib/payment-sync';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export const runtime = 'nodejs';

/**
 * POST /api/choreographer/sessions/complete
 * Mark a session as completed and schedule choreographer payout for Friday
 * When session is completed, automatically schedule 88% of paid amount for payout
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
        { error: 'Only choreographers can complete sessions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sessionIdValue = String(body?.reservationId || body?.sessionId || '').trim();

    if (!sessionIdValue) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }

    await connectDB();

    // Get session and verify ownership
    const session = await Session.findOne({
      _id: sessionIdValue,
      choreographerId: payload.userId,
    })
      .populate('clientId', 'fullName')
      .populate('choreographerId', 'fullName email');

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or you do not have access' },
        { status: 404 }
      );
    }

    // Verify session is paid and can be completed
    if (session.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Session must be paid before marking as completed' },
        { status: 400 }
      );
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 }
      );
    }

    // Calculate 88/12 split
    const { choreographerEarnings, platformFee } = calculatePayoutSplit(session.total);

    // Calculate next Friday for payout
    const payoutScheduledDate = getNextFriday();

    // Check for existing payout
    let payout = await Payout.findOne({ sessionId: session._id });

    if (!payout) {
      // Create new payout record
      payout = new Payout({
        choreographerId: session.choreographerId._id,
        sessionId: session._id,
        amount: choreographerEarnings,
        currency: session.paymentCurrency || 'usd',
        status: 'pending',
        payoutDate: payoutScheduledDate,
        metadata: {
          choreographerName: (session.choreographerId as any).fullName,
          clientName: (session.clientId as any).fullName,
          sessionDate: `${session.date} at ${session.time}`,
        },
      });
      await payout.save();
    } else {
      payout.amount = choreographerEarnings;
      payout.payoutDate = payoutScheduledDate;
      payout.status = 'pending';
      await payout.save();
    }

    // Update session with payout info
    const updatedSession = await Session.findByIdAndUpdate(
      sessionIdValue,
      {
        $set: {
          status: 'completed',
          payoutStatus: 'scheduled',
          choreographerEarnings,
          platformFee,
          payoutScheduledDate,
          payoutId: payout._id,
        },
      },
      { new: true }
    );
    if (updatedSession) {
      await upsertPaymentFromSession(updatedSession as any, { payoutId: String(payout._id) });
    }

    // Update choreographer's running total
    await User.updateOne(
      { _id: session.choreographerId._id },
      {
        $inc: {
          totalEarnings: choreographerEarnings,
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Session marked as completed. Payout scheduled for Friday.',
        session: updatedSession,
        payout: {
          id: payout._id,
          choreographerEarnings,
          platformFee,
          payoutDate: payoutScheduledDate,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session', details: error?.message || error },
      { status: 500 }
    );
  }
}

/**
 * GET /api/choreographer/sessions/pending-payouts
 * Get upcoming payouts for choreographer
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
        { error: 'Only choreographers can view payouts' },
        { status: 403 }
      );
    }

    await connectDB();

    const payouts = await Payout.find({
      choreographerId: payload.userId,
    })
      .populate('sessionId', 'date time total clientId')
      .populate('sessionId.clientId', 'fullName email')
      .sort({ payoutDate: 1 });

    // Calculate summary
    const summary = {
      total: await Payout.countDocuments({ choreographerId: payload.userId }),
      pending: await Payout.countDocuments({
        choreographerId: payload.userId,
        status: 'pending',
      }),
      completed: await Payout.countDocuments({
        choreographerId: payload.userId,
        status: 'completed',
      }),
      totalEarnings: await Payout.aggregate([
        { $match: { choreographerId: { $oid: payload.userId } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    };

    return NextResponse.json(
      {
        success: true,
        payouts,
        summary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts', details: error?.message || error },
      { status: 500 }
    );
  }
}
