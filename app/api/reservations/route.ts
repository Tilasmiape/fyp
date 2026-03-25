import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAvailabilityForDate } from '@/lib/availability';
import Reservation from '@/models/Reservation';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can reserve sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { choreographerId, date, time, duration, sessionType, location } = body || {};

    if (!choreographerId || !date || !time || !sessionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const choreographer = await User.findOne({ _id: choreographerId, role: 'choreographer' }).select('_id pricePerSession availability');
    if (!choreographer) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }

    const allowedTimes = getAvailabilityForDate(choreographer.availability || [], String(date));
    const selectedTime = String(time);
    const selectedDuration = Number(duration) || 60;
    const isTimeAvailable = allowedTimes.some(slot => slot.time === selectedTime && slot.duration === selectedDuration);
    if (!isTimeAvailable) {
      return NextResponse.json({ error: 'Selected time slot is not available' }, { status: 400 });
    }

    const pricePerSession = Number(choreographer.pricePerSession || 0);
    const total = pricePerSession + 50;

    const conflict = await Reservation.findOne({
      choreographerId,
      date: String(date),
      time: String(time),
      duration: selectedDuration,
      status: { $nin: ['rejected', 'cancelled'] },
    }).select('_id');

    if (conflict) {
      return NextResponse.json({ error: 'Time slot is already booked' }, { status: 409 });
    }

    const reservation = await Reservation.create({
      clientId: payload.userId,
      choreographerId,
      date: String(date),
      time: String(time),
      duration: selectedDuration,
      sessionType,
      location: sessionType === 'in-house' ? String(location || '') : '',
      pricePerSession,
      total,
      status: 'pending',
    });

    return NextResponse.json({ success: true, reservationId: reservation._id }, { status: 201 });
  } catch (error: any) {
    console.error('Create reservation error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const choreographerId = searchParams.get('choreographerId');
    const date = searchParams.get('date');

    if (choreographerId && date) {
      if (!['client', 'choreographer'].includes(payload.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const reservations = await Reservation.find({
        choreographerId,
        date: String(date),
        status: { $nin: ['rejected', 'cancelled'] },
      }).select('time duration');

      const reservedTimes = Array.from(new Set(reservations.map((r: any) => r.time))).sort();
      return NextResponse.json({ success: true, reservedTimes }, { status: 200 });
    }

    if (payload.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can view sessions' }, { status: 403 });
    }

    const reservations = await Reservation.find({ clientId: payload.userId, status: { $in: ['accepted', 'confirmed'] } })
      .sort({ createdAt: -1 })
      .populate('choreographerId', 'fullName profileImage');

    const items = reservations.map((r: any) => ({
      id: r._id,
      date: r.date,
      time: r.time,
      sessionType: r.sessionType,
      location: r.location || '',
      status: r.status,
      total: r.total || 0,
      choreographer: {
        id: r.choreographerId?._id || '',
        name: r.choreographerId?.fullName || '',
        profileImage: r.choreographerId?.profileImage || '',
      },
    }));

    return NextResponse.json({ success: true, reservations: items }, { status: 200 });
  } catch (error: any) {
    console.error('Get reservations error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

