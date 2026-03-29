import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Feedback from '@/models/Feedback';
import Notification from '@/models/Notification';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
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
      return NextResponse.json({ error: 'Only choreographers can send feedback' }, { status: 403 });
    }

    const body = await request.json();
    const { reciver_id, booking_id, comment } = body || {};

    if (!reciver_id) {
      return NextResponse.json({ error: 'Receiver id is required' }, { status: 400 });
    }
    if (!comment || !String(comment).trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    await connectDB();

    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const feedback = await Feedback.create({
      feedback_id: feedbackId,
      reciver_id,
      sender_id: payload.userId,
      booking_id: booking_id || undefined,
      comment: String(comment).trim(),
      created_at: new Date(),
    });

    const sender = await User.findById(payload.userId).select('fullName');
    const senderName = sender?.fullName || 'Your choreographer';
    await Notification.create({
      userId: reciver_id,
      type: 'feedback-received',
      title: 'New Choreographer Feedback',
      message: `${senderName} sent you feedback for your session.`,
      reservationId: booking_id || undefined,
      read: false,
    });

    return NextResponse.json(
      {
        success: true,
        feedback: {
          feedback_id: feedback.feedback_id,
          reciver_id: feedback.reciver_id,
          sender_id: feedback.sender_id,
          booking_id: feedback.booking_id || undefined,
          comment: feedback.comment,
          created_at: feedback.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Create feedback error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
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
      return NextResponse.json({ error: 'Only choreographers can view feedback' }, { status: 403 });
    }

    await connectDB();

    const feedbacks = await Feedback.find({ reciver_id: payload.userId })
      .sort({ created_at: -1 })
      .limit(50)
      .populate('sender_id', 'fullName profileImage');

    return NextResponse.json(
      {
        success: true,
        feedbacks: feedbacks.map((f: any) => ({
          feedback_id: f.feedback_id,
          reciver_id: f.reciver_id,
          sender_id: f.sender_id?._id || f.sender_id,
          sender: f.sender_id
            ? {
                id: f.sender_id._id,
                name: f.sender_id.fullName || 'Client',
                profileImage: f.sender_id.profileImage || '',
              }
            : undefined,
          booking_id: f.booking_id || undefined,
          comment: f.comment,
          rating: f.rating ?? undefined,
          created_at: f.created_at,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get feedback error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
