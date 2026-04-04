const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/step-out';

const SessionSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  choreographerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  sessionStatus: { type: String, enum: ['reserved', 'booked', 'cancelled'], default: 'reserved' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  total: { type: Number, default: 0 },
}, { timestamps: true, collection: 'sessions', strict: false });

const ReservationSchema = new mongoose.Schema({}, { strict: false, collection: 'reservations' });

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const Reservation = mongoose.model('ReservationLegacy', ReservationSchema);
  const Session = mongoose.model('Session', SessionSchema);

  const reservations = await Reservation.find({});
  console.log(`Found ${reservations.length} reservations to migrate.`);

  for (const res of reservations) {
    const existing = await Session.findOne({ _id: res._id });
    if (existing) {
      console.log(`Session ${res._id} already exists, skipping.`);
      continue;
    }

    let sessionStatus = 'reserved';
    if (res.paymentStatus === 'paid') {
      sessionStatus = 'booked';
    } else if (res.status === 'rejected' || res.status === 'cancelled') {
      sessionStatus = 'cancelled';
    } else if (res.status === 'pending') {
      sessionStatus = 'reserved';
    } else if (res.status === 'accepted') {
        sessionStatus = 'reserved';
    }

    const sessionData = {
      ...res.toObject(),
      sessionStatus: sessionStatus
    };
    delete sessionData.__v;

    await Session.create(sessionData);
    console.log(`Migrated reservation ${res._id} to sessions.`);
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
