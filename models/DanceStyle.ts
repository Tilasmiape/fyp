import mongoose, { Schema, Document } from 'mongoose';

export interface IDanceStyle extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const DanceStyleSchema = new Schema<IDanceStyle>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.DanceStyle) {
  delete mongoose.models.DanceStyle;
}

export default mongoose.models.DanceStyle || mongoose.model<IDanceStyle>('DanceStyle', DanceStyleSchema);
