import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authToken = req.cookies.get('authToken')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'secret') as any;
    if (decoded.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get filter parameters from query
    const { searchParams } = new URL(req.url);
    const paymentStatus = searchParams.get('paymentStatus');
    const payoutStatus = searchParams.get('payoutStatus');
    const sessionStatus = searchParams.get('sessionStatus');

    // Build filter
    const filter: any = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (payoutStatus) filter.payoutStatus = payoutStatus;
    if (sessionStatus) filter.status = sessionStatus;

    // Get sessions with filters
    const sessions = await Session.find(filter)
      .populate('clientId', 'fullName email profileImage')
      .populate('choreographerId', 'fullName email profileImage')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate stats
    const stats = {
      total: sessions.length,
      paid: sessions.filter((s) => s.paymentStatus === 'paid').length,
      pending: sessions.filter((s) => s.paymentStatus === 'pending').length,
      unpaid: sessions.filter((s) => s.paymentStatus === 'unpaid').length,
      failed: sessions.filter((s) => s.paymentStatus === 'failed').length,
      totalPaymentAmount: sessions
        .filter((s) => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + (s.total || 0), 0),
      totalChoreographerEarnings: sessions
        .filter((s) => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + (s.choreographerEarnings || 0), 0),
      totalPlatformFees: sessions
        .filter((s) => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + (s.platformFee || 0), 0),
    };

    return NextResponse.json({
      success: true,
      stats,
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        date: s.date,
        time: s.time,
        status: s.status,
        paymentStatus: s.paymentStatus,
        payoutStatus: s.payoutStatus,
        client: {
          id: s.clientId._id?.toString() || '',
          name: s.clientId.fullName || 'Unknown',
          email: s.clientId.email,
        },
        choreographer: {
          id: s.choreographerId._id?.toString() || '',
          name: s.choreographerId.fullName || 'Unknown',
          email: s.choreographerId.email,
        },
        total: s.total,
        choreographerEarnings: s.choreographerEarnings || 0,
        platformFee: s.platformFee || 0,
        paidAt: s.paidAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
