import mongoose, { Schema, Document } from 'mongoose';

export interface IReservation extends Document {
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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  decisionReason?: string;
  decisionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
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
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
    decisionReason: { type: String, default: '' },
    decisionAt: { type: Date },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.Reservation) {
  delete mongoose.models.Reservation;
}

const ReservationModel = mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', ReservationSchema);

export default ReservationModel;
