import Payment, { IPayment, PaymentStatus } from '@/models/Payment';
import { ISession } from '@/models/Session';

type SessionLike = Pick<
  ISession,
  | '_id'
  | 'clientId'
  | 'choreographerId'
  | 'paymentStatus'
  | 'paymentAmount'
  | 'paymentCurrency'
  | 'paidAt'
  | 'refundAmount'
  | 'stripeCheckoutSessionId'
  | 'stripePaymentIntentId'
  | 'platformFee'
  | 'choreographerEarnings'
  | 'payoutStatus'
  | 'payoutId'
  | 'date'
  | 'time'
  | 'total'
  | 'sessionStatus'
>;

type PaymentOverrides = Partial<{
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: Date;
  refundAmount: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  platformFee: number;
  choreographerEarnings: number;
  payoutStatus: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'refunded';
  payoutId: string;
}>;

export async function upsertPaymentFromSession(
  session: SessionLike,
  overrides: PaymentOverrides = {}
): Promise<IPayment> {
  const amountFromSession = Number(session.paymentAmount || 0);
  const totalInSmallestUnit = Math.max(0, Math.round(Number(session.total || 0) * 100));
  const setData = {
    reservationId: session._id,
    clientId: session.clientId,
    choreographerId: session.choreographerId,
    status: overrides.status || session.paymentStatus || 'unpaid',
    amount:
      overrides.amount !== undefined
        ? Number(overrides.amount)
        : amountFromSession > 0
          ? amountFromSession
          : totalInSmallestUnit,
    currency: (overrides.currency || session.paymentCurrency || 'usd').toLowerCase(),
    paidAt: overrides.paidAt ?? session.paidAt ?? undefined,
    refundAmount:
      overrides.refundAmount !== undefined
        ? Number(overrides.refundAmount)
        : Number(session.refundAmount || 0),
    stripeCheckoutSessionId:
      overrides.stripeCheckoutSessionId ?? String(session.stripeCheckoutSessionId || ''),
    stripePaymentIntentId:
      overrides.stripePaymentIntentId ?? String(session.stripePaymentIntentId || ''),
    platformFee:
      overrides.platformFee !== undefined
        ? Number(overrides.platformFee)
        : Number(session.platformFee || 0),
    choreographerEarnings:
      overrides.choreographerEarnings !== undefined
        ? Number(overrides.choreographerEarnings)
        : Number(session.choreographerEarnings || 0),
    payoutStatus: overrides.payoutStatus || session.payoutStatus || 'pending',
    payoutId: overrides.payoutId || session.payoutId || undefined,
    metadata: {
      date: String(session.date || ''),
      time: String(session.time || ''),
      total: Number(session.total || 0),
      sessionStatus: String(session.sessionStatus || ''),
    },
  };

  return Payment.findOneAndUpdate(
    { sessionId: session._id },
    {
      $set: setData,
      $setOnInsert: {
        sessionId: session._id,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
}
