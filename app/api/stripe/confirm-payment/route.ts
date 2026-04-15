import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import { requireStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * POST: Called by the client page after returning from embedded checkout.
 * Confirms the Stripe session and updates the DB reservation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const stripeSessionId = String(body?.sessionId || '').trim();

    if (!stripeSessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await connectDB();
    const stripe = requireStripe();
    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);

    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed yet' },
        { status: 402 }
      );
    }

    // Support both metadata key names used across your routes
    const dbSessionId =
      stripeSession.metadata?.reservationId ||
      stripeSession.metadata?.sessionId;

    if (!dbSessionId) {
      return NextResponse.json(
        { success: false, error: 'Reservation ID missing from Stripe metadata' },
        { status: 400 }
      );
    }

    const session = await Session.findById(dbSessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    // Idempotent — don't overwrite if webhook already updated it
    if (session.paymentStatus !== 'paid') {
      const totalAmount = Number(session.total || 0);
      const choreographerEarnings = Math.round(totalAmount * 0.88 * 100) / 100;
      const platformFee = Math.round((totalAmount - choreographerEarnings) * 100) / 100;

      session.paymentStatus = 'paid';
      session.status = 'confirmed';
      session.sessionStatus = 'booked';
      session.paidAt = new Date();
      session.choreographerEarnings = choreographerEarnings;
      session.platformFee = platformFee;
      session.payoutStatus = 'scheduled';
      if (stripeSession.payment_intent) {
        session.stripePaymentIntentId = String(stripeSession.payment_intent);
      }
      await session.save();
    }

    return NextResponse.json({ success: true, reservationId: dbSessionId }, { status: 200 });
  } catch (error: any) {
    console.error('[confirm-payment] POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Redirect-based confirmation (for non-embedded checkout flows).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stripeSessionId = searchParams.get('sessionId');

    if (!stripeSessionId) {
      return NextResponse.redirect(new URL('/client/sessions', request.url));
    }

    await connectDB();
    const stripe = requireStripe();
    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);

    if (stripeSession.payment_status === 'paid') {
      const dbSessionId =
        stripeSession.metadata?.reservationId ||
        stripeSession.metadata?.sessionId;

      if (dbSessionId) {
        const session = await Session.findById(dbSessionId);
        if (session) {
          if (session.paymentStatus !== 'paid') {
            const totalAmount = Number(session.total || 0);
            const choreographerEarnings = Math.round(totalAmount * 0.88 * 100) / 100;
            const platformFee = Math.round((totalAmount - choreographerEarnings) * 100) / 100;

            session.paymentStatus = 'paid';
            session.status = 'confirmed';
            session.sessionStatus = 'booked';
            session.paidAt = new Date();
            session.choreographerEarnings = choreographerEarnings;
            session.platformFee = platformFee;
            session.payoutStatus = 'scheduled';
            await session.save();
          }
          return NextResponse.redirect(new URL('/client/sessions', request.url));
        }
      }
    }

    return NextResponse.redirect(new URL('/client/sessions', request.url));
  } catch (error: any) {
    console.error('[confirm-payment] GET error:', error);
    return NextResponse.redirect(new URL('/client/sessions', request.url));
  }
}
