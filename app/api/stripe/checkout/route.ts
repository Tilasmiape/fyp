import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User, { IUser } from '@/models/User';
import Session from '@/models/Session';
import { requireStripe } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('authToken')?.value ||
      request.headers.get('Authorization')?.substring(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can pay for sessions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reservationId = String(body?.reservationId || body?.sessionId || '').trim();
    if (!reservationId) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }

    await connectDB();

    const reservation = await Session.findOne({
      _id: reservationId,
      clientId: payload.userId,
    });
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }
    if (!['accepted', 'confirmed'].includes(reservation.status)) {
      return NextResponse.json({ error: 'Only accepted sessions can be paid' }, { status: 400 });
    }
    if (reservation.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Session is already paid' }, { status: 400 });
    }

    const choreographer = await User.findById(reservation.choreographerId)
      .select('fullName stripeAccountId stripeOnboarded') as IUser | null;

    if (!choreographer) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }
    if (!choreographer.stripeAccountId || !choreographer.stripeOnboarded) {
      return NextResponse.json(
        { error: 'Choreographer has not completed payment setup yet. Please contact them.' },
        { status: 400 }
      );
    }

    // ── MOCK MODE: Skip Stripe if choreographer has a mock account ──
    if (choreographer.stripeAccountId.startsWith('acct_mock_')) {
      reservation.paymentStatus = 'paid';
      reservation.status = 'confirmed';
      reservation.paidAt = new Date();
      reservation.stripePaymentIntentId = `pi_mock_${Date.now()}`;
      reservation.stripeCheckoutSessionId = `cs_mock_${Date.now()}`;
      reservation.paymentCurrency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
      reservation.paymentAmount = Math.max(1, Math.round(Number(reservation.total || 0) * 100));
      await reservation.save();

      return NextResponse.json(
        { success: true, mock: true, message: 'Payment simulated (Mock Mode).' },
        { status: 200 }
      );
    }
    // ── END MOCK MODE ──

    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    const total = Number(reservation.total || 0);
    const amountInSmallestUnit = Math.max(1, Math.round(total * 100));
    const platformFeeAmount = Math.round(amountInSmallestUnit * 0.12);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const reservationIdValue = reservation._id.toString();
    const choreographerIdValue = reservation.choreographerId.toString();

    const stripeClient = requireStripe();
    const session = await stripeClient.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      payment_method_types: ['card'],
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: choreographer.stripeAccountId!,
        },
        metadata: {
          reservationId: reservationIdValue,
          clientId: payload.userId,
          choreographerId: choreographerIdValue,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountInSmallestUnit,
            product_data: {
              name: `Dance session with ${choreographer.fullName}`,
              description: `${reservation.date} at ${reservation.time}`,
            },
          },
        },
      ],
      return_url: `${appUrl}/client/sessions?payment_complete=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        reservationId: reservationIdValue,
        sessionId: reservationIdValue,
        clientId: payload.userId,
        choreographerId: choreographerIdValue,
      },
    });

    reservation.paymentStatus = 'pending';
    reservation.stripeCheckoutSessionId = session.id;
    reservation.paymentCurrency = currency;
    reservation.paymentAmount = amountInSmallestUnit;
    await reservation.save();

    return NextResponse.json(
      { success: true, id: session.id, clientSecret: session.client_secret },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[stripe/checkout] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}