import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailability extends Document {
    choreographerId: mongoose.Types.ObjectId;
    date: string; // YYYY-MM-DD
    timeSlots: {
        time: string;
        duration: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
    {
        choreographerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        date: {
            type: String,
            required: true,
            index: true,
        },
        timeSlots: [
            {
                time: { type: String, required: true },
                duration: { type: Number, required: true, min: 15, max: 180 },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure uniqueness per choreographer/date (optional, but good practice)
AvailabilitySchema.index({ choreographerId: 1, date: 1 }, { unique: true });

export default mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);
