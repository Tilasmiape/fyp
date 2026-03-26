import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'session-accepted' | 'session-rejected' | 'session-requested';
  title: string;
  message: string;
  reservationId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['session-accepted', 'session-rejected', 'session-requested'], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', default: undefined },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
