import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectDB } from '@/lib/db';
import Reservation from '@/models/Session';
import { requireStripe } from '@/lib/stripe';
import Payout from '@/models/Payout';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    const stripeClient = requireStripe();
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error('[WEBHOOK] Signature error:', error?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // ─── Payment succeeded ───────────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservationId;

      console.log('[WEBHOOK] checkout.session.completed', {
        reservationId,
        sessionId: session.id,
        payment_status: session.payment_status,
      });

      if (reservationId && session.payment_status === 'paid') {
        await connectDB();
        const stripeClient = requireStripe();

        // Retrieve payment intent to get actual split amounts
        const paymentIntent = await stripeClient.paymentIntents.retrieve(
          session.payment_intent as string
        );
        const totalPaidInCents = paymentIntent.amount;
        const platformFeeInCents = paymentIntent.application_fee_amount ?? Math.round(totalPaidInCents * 0.12);
        const choreographerEarningsInCents = totalPaidInCents - platformFeeInCents;
        const platformFee = Math.round((platformFeeInCents / 100) * 100) / 100;
        const choreographerEarnings = Math.round((choreographerEarningsInCents / 100) * 100) / 100;

        const result = await Reservation.findOneAndUpdate(
          { _id: reservationId },
          {
            $set: {
              paymentStatus: 'paid',
              status: 'confirmed',
              stripePaymentIntentId: String(session.payment_intent || ''),
              paidAt: new Date(),
              // Record the split used by admin/choreographer analytics
              platformFee,
              choreographerEarnings,
              payoutStatus: 'scheduled',
            },
          },
          { returnDocument: 'after' }
        )
          .populate('choreographerId', 'fullName')
          .populate('clientId', 'fullName');

        console.log('[WEBHOOK] Reservation updated:', result?._id);

        // Create payout record for internal tracking
        // NOTE: The actual money transfer to the choreographer's bank is handled
        // automatically by Stripe Connect via transfer_data.destination set at checkout.
        if (result && result.paymentStatus === 'paid') {
          try {
            const existing = await Payout.findOne({ sessionId: result._id });
            if (!existing) {
              const nextFriday = getNextFriday();
              const payout = new Payout({
                choreographerId: result.choreographerId._id,
                sessionId: result._id,
                amount: choreographerEarnings,
                currency: result.paymentCurrency || 'usd',
                status: 'pending',
                payoutDate: nextFriday,
                metadata: {
                  choreographerName: (result.choreographerId as any).fullName,
                  clientName: (result.clientId as any).fullName,
                  sessionDate: `${result.date} at ${result.time}`,
                  platformFee,
                  choreographerEarnings,
                  splitPercent: '88/12',
                },
              });
              await payout.save();
              await Reservation.findByIdAndUpdate(reservationId, {
                $set: { payoutId: payout._id },
              });
              console.log(
                `[WEBHOOK] Split recorded - Platform: ${platformFee} | Choreographer: ${choreographerEarnings}`
              );
            }
          } catch (payoutErr) {
            console.error('[WEBHOOK] Payout record error:', payoutErr);
          }
        }
      }
    }

    // ─── Checkout expired without payment ────────────────────────────────────
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservationId;
      if (reservationId) {
        await connectDB();
        await Reservation.updateOne(
          { _id: reservationId, paymentStatus: { $ne: 'paid' } },
          { $set: { paymentStatus: 'failed' } }
        );
        console.log('[WEBHOOK] Checkout expired, reservation marked failed:', reservationId);
      }
    }

    // ─── Payment intent failed ────────────────────────────────────────────────
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const reservationId = intent.metadata?.reservationId;
      if (reservationId) {
        await connectDB();
        await Reservation.updateOne(
          { _id: reservationId, paymentStatus: { $ne: 'paid' } },
          { $set: { paymentStatus: 'failed' } }
        );
        console.log('[WEBHOOK] Payment failed for reservation:', reservationId);
      }
    }

    // ─── Transfer created (Stripe Connect auto-transfer confirmation) ─────────
    if (event.type === 'transfer.created') {
      const transfer = event.data.object as Stripe.Transfer;
      console.log('[WEBHOOK] Transfer to choreographer confirmed:', {
        amount: transfer.amount / 100,
        destination: transfer.destination,
        currency: transfer.currency,
      });
    }
  } catch (error: any) {
    console.error('[WEBHOOK] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

function getNextFriday(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(9, 0, 0, 0);
  return nextFriday;
}
