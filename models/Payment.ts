import mongoose, { Schema, Document } from 'mongoose';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially-refunded';

export interface IPayment extends Document {
  sessionId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  choreographerId: mongoose.Types.ObjectId;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: Date;
  refundAmount?: number;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  platformFee?: number;
  choreographerEarnings?: number;
  payoutStatus?: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'refunded';
  payoutId?: mongoose.Types.ObjectId;
  metadata?: {
    date?: string;
    time?: string;
    total?: number;
    sessionStatus?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, unique: true, index: true },
    // Legacy compatibility field (older deployments used reservationId in payments indexes)
    reservationId: { type: Schema.Types.ObjectId, ref: 'Session', index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    choreographerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
      default: 'unpaid',
      index: true,
    },
    amount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: 'usd' },
    paidAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    stripeCheckoutSessionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    platformFee: { type: Number, default: 0 },
    choreographerEarnings: { type: Number, default: 0 },
    payoutStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    payoutId: { type: Schema.Types.ObjectId, ref: 'Payout' },
    metadata: {
      date: { type: String, default: '' },
      time: { type: String, default: '' },
      total: { type: Number, default: 0 },
      sessionStatus: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: 'payments' }
);

PaymentSchema.index({ choreographerId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ clientId: 1, status: 1, createdAt: -1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default PaymentModel;
