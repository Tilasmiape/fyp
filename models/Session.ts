import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  clientId: mongoose.Types.ObjectId;
  choreographerId: mongoose.Types.ObjectId;
  date: string;
  time: string;
  duration: number;
  sessionType: 'studio' | 'in-house';
  location?: string;
  sessionCategory: 'individual' | 'group';
  participantCount?: number;
  notes?: string;
  pricePerSession: number;
  groupSessionMultiplier?: number;
  total: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  sessionStatus: 'reserved' | 'booked' | 'cancelled';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially-refunded';
  refundAmount?: number;
  cancelledBy?: 'client' | 'choreographer' | 'system';
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paymentCurrency?: string;
  paymentAmount?: number;
  paidAt?: Date;
  decisionReason?: string;
  decisionAt?: Date;
  mustPayBy?: Date;
  reminderSent?: boolean;
  // Payout fields
  payoutStatus: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'refunded';
  choreographerEarnings?: number; // 88% of total
  platformFee?: number; // 12% of total
  payoutScheduledDate?: Date;
  payoutId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    choreographerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true, default: 60 },
    sessionType: { type: String, enum: ['studio', 'in-house'], required: true },
    location: { type: String, default: '' },
    sessionCategory: { type: String, enum: ['individual', 'group'], default: 'individual' },
    participantCount: { type: Number, default: 1, min: 1, max: 100 },
    notes: { type: String, default: '', trim: true },
    pricePerSession: { type: Number, required: true },
    groupSessionMultiplier: { type: Number, default: 1 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'confirmed', 'completed', 'rejected', 'cancelled'], default: 'pending' },
    sessionStatus: { type: String, enum: ['reserved', 'booked', 'cancelled'], default: 'reserved' },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded'], default: 'unpaid' },
    refundAmount: { type: Number, default: 0 },
    cancelledBy: { type: String, enum: ['client', 'choreographer', 'system'] },
    stripeCheckoutSessionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    paymentCurrency: { type: String, default: '' },
    paymentAmount: { type: Number, default: 0 },
    paidAt: { type: Date },
    decisionReason: { type: String, default: '' },
    decisionAt: { type: Date },
    mustPayBy: { type: Date },
    reminderSent: { type: Boolean, default: false },
    // Payout fields - 88/12 split
    payoutStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    choreographerEarnings: { type: Number, default: 0 }, // 88% of total
    platformFee: { type: Number, default: 0 }, // 12% of total
    payoutScheduledDate: { type: Date }, // Scheduled Friday after completion
    payoutId: { type: Schema.Types.ObjectId, ref: 'Payout' },
  },
  { 
    timestamps: true,
    collection: 'sessions' // Explicitly set the collection name
  }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.Session) {
  delete mongoose.models.Session;
}

const SessionModel = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default SessionModel;
