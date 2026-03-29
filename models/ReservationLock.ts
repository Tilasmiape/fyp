import mongoose, { Schema, models, model } from 'mongoose';

const ReservationLockSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    sCount: { type: Number, default: 0 },
    xLock: { type: Boolean, default: false },
    xOwner: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ReservationLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ReservationLock = models.ReservationLock || model('ReservationLock', ReservationLockSchema);

export default ReservationLock;
