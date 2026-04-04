import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Notification from '@/models/Notification';
import { acquireXLock, releaseXLock } from '@/lib/locks';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: 'Only choreographers can update bookings' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || '').toLowerCase();
    const reason = String(body?.reason || '').trim();

    if (!id) return NextResponse.json({ error: 'Missing reservation id' }, { status: 400 });
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'Decision reason is required' }, { status: 400 });
    }

    await connectDB();
    const lockKey = `reservation:${id}`;
    const lockOwner = `${payload.userId}:${Date.now()}`;
    const gotXLock = await acquireXLock(lockKey, lockOwner);
    if (!gotXLock) {
      return NextResponse.json({ error: 'Reservation is being updated. Please try again.' }, { status: 409 });
    }

    try {
      const session = await Session.findOne({ _id: id, choreographerId: payload.userId });
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      if (session.status !== 'pending' && session.sessionStatus !== 'reserved') {
        // Allow updating if it's pending or already reserved (maybe to reject later)
      }

      const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
      const nextSessionStatus = action === 'accept' ? 'reserved' : 'cancelled';
      
      session.status = nextStatus;
      session.sessionStatus = nextSessionStatus;
      session.decisionReason = reason;
      session.decisionAt = new Date();
      await session.save();

      const title = action === 'accept' ? 'Session Accepted' : 'Session Rejected';
      const message = action === 'accept'
        ? `Your session request was accepted. Reason: ${reason}`
        : `Your session request was rejected. Reason: ${reason}`;

      await Notification.create({
        userId: session.clientId,
        sessionId: session._id,
        type: action === 'accept' ? 'session-accepted' : 'session-rejected',
        title,
        message,
      });

      return NextResponse.json({ success: true, status: nextStatus }, { status: 200 });
    } finally {
      await releaseXLock(lockKey, lockOwner);
    }
  } catch (error: any) {
    console.error('Update reservation status error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
