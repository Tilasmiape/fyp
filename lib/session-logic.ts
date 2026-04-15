import { connectDB } from './db';
import Session from '@/models/Session';
import Notification from '@/models/Notification';

/**
 * Automatically cancels unpaid sessions that have passed their 24h payment deadline
 * and sends reminders for sessions approaching that deadline.
 */
export async function runBookingCleanup() {
  try {
    await connectDB();
    const now = new Date();

    // 1. Process Auto-Cancellations
    // Find sessions that are accepted/pending, unpaid, and past the mustPayBy deadline
    const expiredSessions = await Session.find({
      status: { $in: ['accepted', 'pending'] },
      paymentStatus: 'unpaid',
      mustPayBy: { $lt: now },
    });

    for (const session of expiredSessions) {
      session.status = 'cancelled';
      session.sessionStatus = 'cancelled';
      await session.save();

      // Notify Client
      await Notification.create({
        userId: session.clientId,
        type: 'session-auto-cancelled',
        title: 'Reservation Auto-Cancelled',
        message: `Your reservation for ${session.date} at ${session.time} was cancelled because the 24-hour payment deadline passed.`,
        sessionId: session._id,
      });

      // Notify Choreographer (Optional but professional)
      await Notification.create({
        userId: session.choreographerId,
        type: 'session-auto-cancelled',
        title: 'Session Cancelled (Unpaid)',
        message: `The reservation for ${session.date} at ${session.time} has been auto-cancelled due to non-payment.`,
        sessionId: session._id,
      });
    }

    // 2. Process Payment Reminders
    // Find sessions that are accepted, unpaid, deadline is within 12 hours, and no reminder sent yet
    const reminderWindow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const pendingReminders = await Session.find({
      status: 'accepted',
      paymentStatus: 'unpaid',
      reminderSent: false,
      mustPayBy: { $gt: now, $lt: reminderWindow },
    });

    for (const session of pendingReminders) {
      // Notify Client
      await Notification.create({
        userId: session.clientId,
        type: 'payment-reminder',
        title: 'Payment Reminder',
        message: `Your session on ${session.date} at ${session.time} will be cancelled soon if not paid. You have less than 12 hours left before the deadline!`,
        sessionId: session._id,
      });

      session.reminderSent = true;
      await session.save();
    }

    if (expiredSessions.length > 0 || pendingReminders.length > 0) {
      console.log(`[Cleanup] Cancelled ${expiredSessions.length} sessions, sent ${pendingReminders.length} reminders.`);
    }
  } catch (error) {
    console.error('[Cleanup Error]', error);
  }
}
