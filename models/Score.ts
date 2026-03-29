import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  score_id: string;
  client_id?: mongoose.Types.ObjectId;
  choreographer_id: mongoose.Types.ObjectId;
  booking_id?: mongoose.Types.ObjectId;
  score: number;
  given_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new Schema<IScore>(
  {
    score_id: { type: String, required: true, trim: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    choreographer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    booking_id: { type: Schema.Types.ObjectId, ref: 'Reservation', default: undefined },
    score: { type: Number, required: true, min: 0, max: 10 },
    given_at: { type: Date, required: true },
  },
  { timestamps: true, collection: 'scores' }
);

ScoreSchema.index({ score_id: 1 }, { unique: true });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Score) {
  delete mongoose.models.Score;
}

const ScoreModel = mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema);

export default ScoreModel;
