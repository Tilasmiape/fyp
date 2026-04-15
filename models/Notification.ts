import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'session-accepted' | 'session-rejected' | 'session-requested' | 'score-received' | 'review-received' | 'attendance-marked' | 'feedback-received' | 'account-suspended' | 'account-deleted' | 'account-restored' | 'account-approved' | 'account-rejected' | 'payment-reminder' | 'session-auto-cancelled' | 'session-cancelled';
  title: string;
  message: string;
  sessionId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['session-accepted', 'session-rejected', 'session-requested', 'score-received', 'review-received', 'attendance-marked', 'feedback-received', 'account-suspended', 'account-deleted', 'account-restored', 'account-approved', 'account-rejected', 'payment-reminder', 'session-auto-cancelled', 'session-cancelled'], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: undefined },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
