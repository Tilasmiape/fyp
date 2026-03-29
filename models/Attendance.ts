import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  choreographerId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  studentName: string;
  classTitle: string;
  classTime: string;
  style: string;
  date: string;
  status: 'unmarked' | 'present' | 'absent';
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    choreographerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Reservation', default: undefined },
    studentName: { type: String, required: true, trim: true },
    classTitle: { type: String, default: 'Student Session', trim: true },
    classTime: { type: String, default: '', trim: true },
    style: { type: String, default: '', trim: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['unmarked', 'present', 'absent'], default: 'unmarked' },
    score: { type: Number, default: null },
  },
  { timestamps: true, collection: 'attendances' }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.Attendance) {
  delete mongoose.models.Attendance;
}

const AttendanceModel =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default AttendanceModel;
