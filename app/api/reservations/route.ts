import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';
import { getAvailabilityForDate } from '@/lib/availability';
import Reservation from '@/models/Reservation';
import Notification from '@/models/Notification';
import { acquireSLock, acquireXLock, releaseSLock, releaseXLock } from '@/lib/locks';

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
    const {
      choreographerId,
      date,
      time,
      duration,
      sessionType,
      location,
      sessionCategory = 'individual',
      participantCount = 1,
      notes = '',
    } = body || {};

    if (!choreographerId || !date || !time || !sessionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sessionCategory === 'group' && (!participantCount || participantCount < 2)) {
      return NextResponse.json(
        { error: 'Group sessions must have at least 2 participants' },
        { status: 400 }
      );
    }

    await connectDB();
    const choreographer = await User.findOne({ _id: choreographerId, role: 'choreographer' }).select(
      '_id pricePerSession groupSessionPriceMultiplier'
    );
    if (!choreographer) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }

    const selectedTime = String(time);
    const selectedDuration = Number(duration) || 60;

    // Fetch availability from separate collection
    const choreographerAvailabilities = await Availability.find({ choreographerId }).select('date timeSlots -_id');
    const dateAvailability = choreographerAvailabilities.find((a: any) => a.date === date);
    const hasPresetSlots = dateAvailability && dateAvailability.timeSlots && dateAvailability.timeSlots.length > 0;

    if (hasPresetSlots) {
      // Require selection from preset slots
      const allowedTimes = getAvailabilityForDate(choreographerAvailabilities as any || [], String(date));
      const isTimeAvailable = allowedTimes.some(
        (slot) => slot.time === selectedTime && slot.duration === selectedDuration
      );
      if (!isTimeAvailable) {
        return NextResponse.json(
          { error: 'Selected time slot is not available. Please choose from available time slots.' },
          { status: 400 }
        );
      }
    } else {
      // Custom time - validate time format and duration
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(selectedTime)) {
        return NextResponse.json({ error: 'Invalid time format. Use HH:MM format.' }, { status: 400 });
      }
      if (selectedDuration < 30 || selectedDuration > 120) {
        return NextResponse.json(
          { error: 'Duration must be between 30 and 120 minutes' },
          { status: 400 }
        );
      }
    }

    const lockKey = `slot:${choreographerId}:${date}:${selectedTime}:${selectedDuration}`;
    const lockOwner = `${payload.userId}:${Date.now()}`;
    const gotXLock = await acquireXLock(lockKey, lockOwner);
    if (!gotXLock) {
      return NextResponse.json({ error: 'Time slot is currently being booked. Please try again.' }, { status: 409 });
    }

    try {
      // Check for time slot conflicts
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

    // Calculate pricing with group multiplier
    const pricePerSession = Number(choreographer.pricePerSession || 0);
    let multiplier = 1;
    if (sessionCategory === 'group') {
      multiplier = Number(choreographer.groupSessionPriceMultiplier || 1.3);
    }
    const total = Math.round((pricePerSession * multiplier + 50) * 100) / 100;

    const reservation = await Reservation.create({
      clientId: payload.userId,
      choreographerId,
      date: String(date),
      time: String(time),
      duration: selectedDuration,
      sessionType,
      location: sessionType === 'in-house' ? String(location || '') : '',
      sessionCategory,
      participantCount: sessionCategory === 'group' ? Number(participantCount) : 1,
      notes: String(notes || '').trim(),
      pricePerSession,
      groupSessionMultiplier: multiplier,
      total,
      status: 'pending',
    });

    // Create notification for choreographer
    const sessionTypeLabel = sessionCategory === 'group' ? `Group Session (${participantCount} participants)` : 'Individual Session';
    const notificationMessage = `New ${sessionTypeLabel} request for ${date} at ${time}`;

    await Notification.create({
      userId: choreographerId,
      type: 'session-requested',
      title: 'New Session Request',
      message: notificationMessage,
      reservationId: reservation._id,
    });

      return NextResponse.json({ success: true, reservationId: reservation._id }, { status: 201 });
    } finally {
      await releaseXLock(lockKey, lockOwner);
    }
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

      const sKey = `availability:${choreographerId}:${date}`;
      const gotSLock = await acquireSLock(sKey);
      if (!gotSLock) {
        return NextResponse.json({ error: 'Availability is being updated. Please try again.' }, { status: 409 });
      }

      try {
        const reservations = await Reservation.find({
        choreographerId,
        date: String(date),
        status: { $nin: ['rejected', 'cancelled'] },
        }).select('time duration');

        const reservedTimes = Array.from(new Set(reservations.map((r: any) => r.time))).sort();
        return NextResponse.json({ success: true, reservedTimes }, { status: 200 });
      } finally {
        await releaseSLock(sKey);
      }
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
