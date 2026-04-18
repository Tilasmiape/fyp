const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI (or MONGODB_URI) in environment.');
  process.exit(1);
}

const SessionSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'sessions' }
);

const PaymentSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'payments' }
);

function paymentAmountFromSession(session) {
  const fromSession = Number(session.paymentAmount || 0);
  if (fromSession > 0) return fromSession;
  return Math.max(0, Math.round(Number(session.total || 0) * 100));
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Session = mongoose.model('SessionMigration', SessionSchema);
  const Payment = mongoose.model('PaymentMigration', PaymentSchema);

  const indexes = await Payment.collection.indexes();
  const legacyReservationIndex = indexes.find(
    (idx) => idx.name === 'reservationId_1' && Boolean(idx.unique)
  );
  if (legacyReservationIndex) {
    await Payment.collection.dropIndex('reservationId_1');
    console.log('Dropped legacy unique index: payments.reservationId_1');
  }

  const sessions = await Session.find({
    paymentStatus: {
      $in: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
    },
  });

  console.log(`Found ${sessions.length} sessions to sync into payments.`);

  let upserted = 0;
  for (const session of sessions) {
    await Payment.findOneAndUpdate(
      { sessionId: session._id },
      {
        $set: {
          reservationId: session._id,
          sessionId: session._id,
          clientId: session.clientId,
          choreographerId: session.choreographerId,
          status: session.paymentStatus || 'unpaid',
          amount: paymentAmountFromSession(session),
          currency: String(session.paymentCurrency || 'usd').toLowerCase(),
          paidAt: session.paidAt || undefined,
          refundAmount: Number(session.refundAmount || 0),
          stripeCheckoutSessionId: String(session.stripeCheckoutSessionId || ''),
          stripePaymentIntentId: String(session.stripePaymentIntentId || ''),
          platformFee: Number(session.platformFee || 0),
          choreographerEarnings: Number(session.choreographerEarnings || 0),
          payoutStatus: session.payoutStatus || 'pending',
          payoutId: session.payoutId || undefined,
          metadata: {
            date: String(session.date || ''),
            time: String(session.time || ''),
            total: Number(session.total || 0),
            sessionStatus: String(session.sessionStatus || ''),
          },
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    upserted += 1;
  }

  console.log(`Done. Payments upserted: ${upserted}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Migration failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
