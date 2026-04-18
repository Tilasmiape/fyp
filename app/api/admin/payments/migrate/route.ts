import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import Session from '@/models/Session';
import { upsertPaymentFromSession } from '@/lib/payment-sync';
import Payment from '@/models/Payment';

export const runtime = 'nodejs';

/**
 * POST /api/admin/payments/migrate
 * Backfill `payments` collection from existing `sessions` payment fields.
 */
export async function POST(_request: NextRequest) {
  try {
    const { user } = await getValidatedSession('super-admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    // Cleanup stale legacy unique index from older payments schema if it still exists.
    const indexes = await Payment.collection.indexes();
    const hasLegacyReservationIndex = indexes.some(
      (idx) => idx.name === 'reservationId_1' && Boolean(idx.unique)
    );
    if (hasLegacyReservationIndex) {
      await Payment.collection.dropIndex('reservationId_1');
    }

    const sessions = await Session.find({
      paymentStatus: { $in: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded'] },
    }).select(
      '_id clientId choreographerId paymentStatus paymentAmount paymentCurrency paidAt refundAmount stripeCheckoutSessionId stripePaymentIntentId platformFee choreographerEarnings payoutStatus payoutId date time total sessionStatus'
    );

    let migrated = 0;
    for (const session of sessions) {
      await upsertPaymentFromSession(session as any);
      migrated += 1;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment migration completed',
        droppedLegacyReservationIndex: hasLegacyReservationIndex,
        sessionsScanned: sessions.length,
        paymentsUpserted: migrated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error migrating payments:', error);
    return NextResponse.json(
      { error: 'Failed to migrate payments', details: error?.message || error },
      { status: 500 }
    );
  }
}
