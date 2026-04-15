import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { runBookingCleanup } from '@/lib/session-logic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await runBookingCleanup();

    const authToken = req.cookies.get('authToken')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'secret') as any;
    const choreographerId = decoded.userId;

    if (!choreographerId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all sessions for this choreographer
    const sessions = await Session.find({
      choreographerId,
    })
      .populate('clientId', 'fullName email profileImage')
      .sort({ date: -1, time: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        date: s.date,
        time: s.time,
        status: s.status,
        sessionStatus: s.sessionStatus || (s.status === 'pending' ? 'reserved' : s.status === 'cancelled' ? 'cancelled' : 'booked'),
        paymentStatus: s.paymentStatus,
        payoutStatus: s.payoutStatus,
        client: {
          id: s.clientId._id?.toString() || '',
          name: s.clientId.fullName || 'Unknown',
          profileImage: s.clientId.profileImage,
        },
        total: s.total,
        choreographerEarnings: s.choreographerEarnings || 0,
        platformFee: s.platformFee || 0,
        sessionType: s.sessionType,
        sessionCategory: s.sessionCategory,
        participantCount: s.participantCount,
      })),
    });
  } catch (error) {
    console.error('Error fetching choreographer sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
