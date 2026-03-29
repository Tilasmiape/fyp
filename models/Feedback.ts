import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  feedback_id: string;
  reciver_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  booking_id?: mongoose.Types.ObjectId;
  comment: string;
  rating?: number;
  created_at: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    feedback_id: { type: String, required: true, trim: true },
    reciver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    booking_id: { type: Schema.Types.ObjectId, ref: 'Reservation', default: undefined },
    comment: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: undefined },
    created_at: { type: Date, required: true },
  },
  { collection: 'feedbacks' }
);

FeedbackSchema.index({ feedback_id: 1 }, { unique: true });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Feedback) {
  delete mongoose.models.Feedback;
}

const FeedbackModel = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default FeedbackModel;
