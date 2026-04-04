import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import { requireStripe } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-later';

export const runtime = 'nodejs';

/**
 * GET: Fetch reservations (sessions) filtered by choreographer and date.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const choreographerId = searchParams.get('choreographerId');
    const date = searchParams.get('date');

    const query: any = {};
    if (choreographerId) query.choreographerId = choreographerId;
    if (date) query.date = date;

    const sessions = await Session.find(query).populate('choreographerId', 'fullName').lean();
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a pending session and a Stripe Checkout session.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload.userId;

    const body = await request.json().catch(() => ({}));
    const { choreographerId, date, time, duration, total, currency } = body;

    await connectDB();
    const stripe = requireStripe();

    const newSession = new Session({
      choreographerId,
      clientId: userId,
      date,
      time,
      duration,
      total,
      paymentCurrency: currency || 'usd',
      paymentStatus: 'pending',
      status: 'pending',
      sessionStatus: 'requested',
    });
    await newSession.save();

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: `Dance Session Booking`,
              description: `Scheduled for ${date} at ${time}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/confirm-payment?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/sessions`,
      metadata: {
        sessionId: newSession._id.toString(),
        clientId: userId,
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    console.error('Reservation creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}