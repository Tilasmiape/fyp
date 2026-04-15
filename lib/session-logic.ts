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

    // 1. Process Auto-Cancellations and Reminders
    // Find all sessions that are reserved and unpaid
    const activeUnpaid = await Session.find({
      sessionStatus: 'reserved',
      paymentStatus: 'unpaid',
    });

    const expiredSessions = [];
    const pendingReminders = [];

    for (const session of activeUnpaid) {
      const [year, month, day] = session.date.split('-').map(Number);
      const [clock, meridiem] = session.time.trim().split(' ');
      const [hh, mm] = clock.split(':').map(Number);
      let hours = hh;
      if (meridiem) {
        hours = hh % 12;
        if (meridiem.toUpperCase() === 'PM') {
          hours += 12;
        }
      }
      const sessionStartTime = new Date(year, month - 1, day, hours, mm);
      const timeDiffMs = sessionStartTime.getTime() - now.getTime();
      const hoursRemaining = timeDiffMs / (1000 * 60 * 60);

      if (hoursRemaining < 24) {
        expiredSessions.push(session);
      } else if (hoursRemaining < 36 && !session.reminderSent) {
        // Send a reminder if within 12 hours of the deadline
        pendingReminders.push(session);
      }
    }

    for (const session of expiredSessions) {
      session.status = 'cancelled';
      session.sessionStatus = 'cancelled';
      await session.save();

      // Notify Client
      await Notification.create({
        userId: session.clientId,
        type: 'session-auto-cancelled',
        title: 'Reservation Auto-Cancelled',
        message: `Your reservation for ${session.date} at ${session.time} was cancelled because it reached the 24-hour urgent payment deadline.`,
        sessionId: session._id,
      });

      // Notify Choreographer (Optional but professional)
      await Notification.create({
        userId: session.choreographerId,
        type: 'session-auto-cancelled',
        title: 'Session Cancelled (Unpaid)',
        message: `The reservation for ${session.date} at ${session.time} has been auto-cancelled due to non-payment within 24 hours of the start time.`,
        sessionId: session._id,
      });
    }

    for (const session of pendingReminders) {
      // Notify Client
      await Notification.create({
        userId: session.clientId,
        type: 'payment-reminder',
        title: 'Urgent Payment Reminder',
        message: `Your session on ${session.date} at ${session.time} will be auto-cancelled in less than 12 hours if it remains unpaid!`,
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
