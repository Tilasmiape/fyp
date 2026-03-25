import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Reservation from '@/models/Reservation';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'choreographer') {
      return NextResponse.json({ error: 'Only choreographers can view bookings' }, { status: 403 });
    }

    await connectDB();
    const reservations = await Reservation.find({ choreographerId: payload.userId })
      .sort({ createdAt: -1 })
      .populate('clientId', 'fullName');

    const items = reservations.map((r: any) => ({
      id: r._id,
      date: r.date,
      time: r.time,
      sessionType: r.sessionType,
      location: r.location || '',
      status: r.status === 'confirmed' ? 'accepted' : r.status,
      decisionReason: r.decisionReason || '',
      client: {
        id: r.clientId?._id || '',
        name: r.clientId?.fullName || 'Client',
      },
    }));

    return NextResponse.json({ success: true, reservations: items }, { status: 200 });
  } catch (error: any) {
    console.error('Get choreographer reservations error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
