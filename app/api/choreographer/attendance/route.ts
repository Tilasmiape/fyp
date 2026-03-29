import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import Score from '@/models/Score';
import Notification from '@/models/Notification';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDateKey(value: string | null) {
  if (!value) return getTodayKey();
  return String(value).slice(0, 10);
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
      return NextResponse.json({ error: 'Only choreographers can view attendance' }, { status: 403 });
    }

    await connectDB();

    const searchParams = new URL(request.url).searchParams;
    const dateKey = normalizeDateKey(searchParams.get('date'));

    const todayRoll = await Attendance.find({
      choreographerId: payload.userId,
      date: dateKey,
    }).sort({ createdAt: -1 });

    const recentHistory = await Attendance.find({
      choreographerId: payload.userId,
      status: { $in: ['present', 'absent'] },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

    const scoreIds = [
      ...todayRoll.map((record: any) => String(record._id)),
      ...recentHistory.map((record: any) => String(record._id)),
    ];
    const scoreDocs = scoreIds.length
      ? await Score.find({ score_id: { $in: scoreIds } })
      : [];
    const scoreMap = new Map(scoreDocs.map((doc: any) => [String(doc.score_id), doc]));

    return NextResponse.json(
      {
        success: true,
        date: dateKey,
        todayRoll: todayRoll.map((record: any) => ({
          id: record._id,
          studentName: record.studentName,
          classTitle: record.classTitle,
          classTime: record.classTime,
          style: record.style,
          date: record.date,
          status: record.status,
          client_id: record.clientId || undefined,
          booking_id: record.bookingId || undefined,
          score: scoreMap.get(String(record._id))?.score ?? record.score ?? null,
        })),
        recentHistory: recentHistory.map((record: any) => ({
          id: record._id,
          studentName: record.studentName,
          classTitle: record.classTitle,
          classTime: record.classTime,
          style: record.style,
          date: record.date,
          status: record.status,
          client_id: record.clientId || undefined,
          booking_id: record.bookingId || undefined,
          score: scoreMap.get(String(record._id))?.score ?? record.score ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only choreographers can update attendance' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      id,
      studentName,
      classTitle,
      classTime,
      style,
      date,
      status,
      score,
      client_id,
      booking_id,
    } = body || {};

    const normalizedStatus =
      status === 'present' || status === 'absent' || status === 'unmarked'
        ? status
        : undefined;

    if (!id && (!studentName || !String(studentName).trim())) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    }

    const dateKey = normalizeDateKey(date || getTodayKey());
    const normalizedScore =
      normalizedStatus === 'present' && Number.isFinite(Number(score)) ? Number(score) : null;

    const payloadData: any = {
      studentName: studentName ? String(studentName).trim() : undefined,
      classTitle: classTitle ? String(classTitle).trim() : 'Student Session',
      classTime: classTime ? String(classTime).trim() : '',
      style: style ? String(style).trim() : '',
      date: dateKey,
      status: normalizedStatus || 'unmarked',
      score: normalizedStatus === 'present' ? normalizedScore : null,
    };
    if (client_id !== undefined) {
      payloadData.clientId = client_id || undefined;
    }
    if (booking_id !== undefined) {
      payloadData.bookingId = booking_id || undefined;
    }

    let record: any = null;

    if (id) {
      record = await Attendance.findOneAndUpdate(
        { _id: id, choreographerId: payload.userId },
        { $set: payloadData },
        { new: true }
      );
      if (!record) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }
    } else {
      record = await Attendance.create({
        ...payloadData,
        choreographerId: payload.userId,
      });
    }

    const scoreId = String(record._id);
    const resolvedClientId = client_id || record.clientId || undefined;
    const resolvedBookingId = booking_id || record.bookingId || undefined;
    if (resolvedClientId && (normalizedStatus === 'present' || normalizedStatus === 'absent')) {
      await Notification.create({
        userId: resolvedClientId,
        type: 'attendance-marked',
        title: 'Attendance Updated',
        message: `Your choreographer marked you as ${normalizedStatus}.`,
        reservationId: resolvedBookingId || undefined,
        read: false,
      });
    }

    if (normalizedStatus === 'present' && normalizedScore !== null) {
      await Score.findOneAndUpdate(
        { score_id: scoreId },
        {
          $set: {
            score_id: scoreId,
            client_id: resolvedClientId,
            choreographer_id: payload.userId,
            booking_id: resolvedBookingId,
            score: normalizedScore,
            given_at: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      if (resolvedClientId) {
        const sender = await User.findById(payload.userId).select('fullName');
        const senderName = sender?.fullName || 'Your choreographer';
        await Notification.create({
          userId: resolvedClientId,
          type: 'score-received',
          title: 'New Performance Score',
          message: `${senderName} rated your session with a score of ${normalizedScore}/10.`,
          reservationId: resolvedBookingId || undefined,
          read: false,
        });
      }
    } else {
      await Score.deleteOne({ score_id: scoreId });
    }

    return NextResponse.json(
      {
        success: true,
        attendance: {
          id: record._id,
          studentName: record.studentName,
          classTitle: record.classTitle,
          classTime: record.classTime,
          style: record.style,
          date: record.date,
          status: record.status,
          client_id: record.clientId || undefined,
          booking_id: record.bookingId || undefined,
          score: record.score ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
