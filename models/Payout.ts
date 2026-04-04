import mongoose, { Schema, Document } from 'mongoose';

export interface IPayout extends Document {
  choreographerId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  amount: number; // 88% of session total
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripeTransferId?: string;
  stripeTransferReversalId?: string;
  payoutDate: Date; // The date it was supposed to be paid out
  processedAt?: Date;
  errorMessage?: string;
  metadata?: {
    choreographerName?: string;
    clientName?: string;
    sessionDate?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    choreographerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'usd' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    stripeTransferId: { type: String, default: '' },
    stripeTransferReversalId: { type: String, default: '' },
    payoutDate: { type: Date, required: true },
    processedAt: { type: Date },
    errorMessage: { type: String, default: '' },
    metadata: {
      choreographerName: { type: String, default: '' },
      clientName: { type: String, default: '' },
      sessionDate: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: 'payments' }
);

// Compound index for efficient querying
PayoutSchema.index({ choreographerId: 1, payoutDate: 1 });
PayoutSchema.index({ status: 1, payoutDate: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Payout) {
  delete mongoose.models.Payout;
}

const PayoutModel = mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);

export default PayoutModel;
