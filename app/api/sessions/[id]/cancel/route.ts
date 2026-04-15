import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Notification from '@/models/Notification';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectDB();

    const authToken = req.cookies.get('authToken')?.value;
    if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const session = await Session.findById(id);
    if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    // Identify who is cancelling
    const isClient = session.clientId.toString() === decoded.userId;
    const isChoreographer = session.choreographerId.toString() === decoded.userId;

    if (!isClient && !isChoreographer) {
      return NextResponse.json({ success: false, error: 'You are not authorized to cancel this session' }, { status: 403 });
    }

    const now = new Date();
    // Parse session date and time
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

    let refundAmount = 0;
    let finalChoreographerEarnings = session.choreographerEarnings || 0;
    let finalPlatformFee = session.platformFee || 0;

    if (session.paymentStatus === 'paid') {
      if (isChoreographer) {
        // 1. Choreographer cancels -> Full Refund to Client
        refundAmount = session.total;
        finalChoreographerEarnings = 0;
        finalPlatformFee = 0;
        session.paymentStatus = 'refunded';
      } else {
        // 2. Client cancels
        if (hoursRemaining > 24) {
          // Outside 24h -> Full Refund
          refundAmount = session.total;
          finalChoreographerEarnings = 0;
          finalPlatformFee = 0;
          session.paymentStatus = 'refunded';
        } else {
          // Within 24h -> 50% Penalty
          refundAmount = session.total * 0.5;
          const remaining50 = session.total * 0.5;
          
          // Split the remaining 50% between artist (88%) and platform (12%)
          finalChoreographerEarnings = Math.round(remaining50 * 0.88 * 100) / 100;
          finalPlatformFee = Math.round(remaining50 * 0.12 * 100) / 100;
          
          session.paymentStatus = 'partially-refunded';
        }
      }
    }

    // Update Session
    session.status = 'cancelled';
    session.sessionStatus = 'cancelled';
    session.cancelledBy = isClient ? 'client' : 'choreographer';
    session.refundAmount = refundAmount;
    session.choreographerEarnings = finalChoreographerEarnings;
    session.platformFee = finalPlatformFee;
    await session.save();

    // Notify other party
    const recipientId = isClient ? session.choreographerId : session.clientId;
    const cancellerName = isClient ? 'The client' : 'The choreographer';
    
    let notificationMsg = `${cancellerName} has cancelled the session on ${session.date} at ${session.time}.`;
    if (session.paymentStatus === 'partially-refunded' && isClient) {
      notificationMsg += ` A 50% late cancellation penalty has been applied. You will receive ${finalChoreographerEarnings} NPR.`;
    } else if (session.paymentStatus === 'refunded') {
      notificationMsg += ` A full refund has been initiated.`;
    }

    await Notification.create({
      userId: recipientId,
      type: 'session-cancelled',
      title: 'Session Cancelled',
      message: notificationMsg,
      sessionId: session._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully',
      refundAmount,
      paymentStatus: session.paymentStatus
    });

  } catch (error: any) {
    console.error('Cancellation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
