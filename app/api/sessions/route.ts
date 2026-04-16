import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';
import { getAvailabilityForDate } from '@/lib/availability';
import Session from '@/models/Session';
import Notification from '@/models/Notification';
import { acquireSLock, acquireXLock, releaseSLock, releaseXLock } from '@/lib/locks';
import { runBookingCleanup } from '@/lib/session-logic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function POST(request: NextRequest) {
  try {
    let token = request.cookies.get('authToken')?.value;
    
    // Fallback to Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

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
      payNow = false, // New flag: true if booking and paying immediately
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

    // Enforce reservation rules
    const now = new Date();

    // Safely parse time string like "09:00", "9:00", or "09:00 AM" into standard "HH:mm"
    let parsedTime = String(time);
    let isPM = parsedTime.toLowerCase().includes('pm');
    let isAM = parsedTime.toLowerCase().includes('am');
    parsedTime = parsedTime.replace(/am|pm/ig, '').trim();
    
    let [hoursStr, minutesStr] = parsedTime.split(':');
    let h = parseInt(hoursStr || '0', 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    
    const formattedTimeStr = `${String(h).padStart(2, '0')}:${(minutesStr || '00').padStart(2, '0')}:00`;
    const sessionDateTime = new Date(`${date}T${formattedTimeStr}`);

    const diffInMs = sessionDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    // If session is less than 24 hours away, must pay immediately
    if (!payNow && diffInHours < 24) {
      return NextResponse.json({ 
        error: 'Urgent sessions (less than 24 hours away) require immediate payment. Please use "Pay & Book Now".' 
      }, { status: 400 });
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

    // Determine IF this is an auto-approval case (from preset availability)
    let isAutoApproved = false;
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
      isAutoApproved = true; // Preset slots are auto-approved
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
      isAutoApproved = false; // Custom times still need choreographer approval
    }

    const lockKey = `slot:${choreographerId}:${date}:${selectedTime}:${selectedDuration}`;
    const lockOwner = `${payload.userId}:${Date.now()}`;
    const gotXLock = await acquireXLock(lockKey, lockOwner);
    if (!gotXLock) {
      return NextResponse.json({ error: 'Time slot is currently being booked. Please try again.' }, { status: 409 });
    }

    try {
      // Check for time slot conflicts
      const conflict = await Session.findOne({
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

    const session = await Session.create({
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
      status: isAutoApproved ? 'accepted' : 'pending',
      sessionStatus: 'reserved',
      mustPayBy: (() => {
        const now = new Date();
        // 1. Deadline is 24 hours from the moment of booking
        const bookingDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        // 2. Deadline must also be at least 24 hours before the session starts
        const sessionPriorDeadline = new Date(new Date(sessionDateTime).getTime() - 24 * 60 * 60 * 1000);
        
        // Take the earlier of the two
        let finalDeadline = bookingDeadline < sessionPriorDeadline ? bookingDeadline : sessionPriorDeadline;
        
        // If session is within 24 hours, payment is due immediately
        if (finalDeadline < now) finalDeadline = now;
        
        return finalDeadline;
      })(),
      choreographerEarnings: Math.round(total * 0.88 * 100) / 100,
      platformFee: Math.round(total * 0.12 * 100) / 100,
    });

    // Create notification for choreographer
    const sessionTypeLabel = sessionCategory === 'group' ? `Group Session (${participantCount} participants)` : 'Individual Session';
    const notificationMessage = `New ${sessionTypeLabel} request for ${date} at ${time}`;

    await Notification.create({
      userId: choreographerId,
      type: 'session-requested',
      title: 'New Session Request',
      message: notificationMessage,
      sessionId: session._id,
    });

      return NextResponse.json({ success: true, sessionId: session._id }, { status: 201 });
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
    let token = request.cookies.get('authToken')?.value;
    
    // Fallback to Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

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
    
    // Periodically clean up expired sessions whenever someone views the list
    await runBookingCleanup();

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
        const sessions = await Session.find({
        choreographerId,
        date: String(date),
        status: { $nin: ['rejected', 'cancelled'] },
        }).select('time duration');

        const reservedTimes = Array.from(new Set(sessions.map((r: any) => r.time))).sort();
        return NextResponse.json({ success: true, reservedTimes }, { status: 200 });
      } finally {
        await releaseSLock(sKey);
      }
    }

    if (payload.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can view sessions' }, { status: 403 });
    }

    const sessions = await Session.find({ clientId: payload.userId })
      .sort({ createdAt: -1 })
      .populate('choreographerId', 'fullName profileImage');

    const items = sessions.map((r: any) => {
      let sessionStatus: 'reserved' | 'booked' | 'cancelled' = 'reserved';
      if (r.status === 'confirmed' || r.paymentStatus === 'paid') sessionStatus = 'booked';
      if (['rejected', 'cancelled'].includes(r.status)) sessionStatus = 'cancelled';
      if (r.status === 'pending') sessionStatus = 'reserved';

      return {
        id: r._id,
        date: r.date,
        time: r.time,
        sessionType: r.sessionType,
        location: r.location || '',
        status: r.status,
        sessionStatus: r.sessionStatus || sessionStatus,
        paymentStatus: r.paymentStatus || 'unpaid',
        total: r.total || 0,
        mustPayBy: r.mustPayBy,
        choreographer: {
          id: r.choreographerId?._id || '',
          name: r.choreographerId?.fullName || '',
          profileImage: r.choreographerId?.profileImage || '',
        },
      };
    });

    return NextResponse.json({ success: true, sessions: items }, { status: 200 });
  } catch (error: any) {
    console.error('Get reservations error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
