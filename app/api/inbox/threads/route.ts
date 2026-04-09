import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Message from '@/models/Message';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

function makeConversationKey(a: string, b: string) {
  return [String(a), String(b)].sort().join(':');
}

function getAuthPayload(request: NextRequest): AuthPayload | null {
  let token = request.cookies.get('authToken')?.value;
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthPayload(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['client', 'choreographer'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const sessionFilter =
      auth.role === 'client' ? { clientId: auth.userId } : { choreographerId: auth.userId };

    const sessions = await Session.find(sessionFilter)
      .populate('clientId', 'fullName profileImage role')
      .populate('choreographerId', 'fullName profileImage role')
      .sort({ updatedAt: -1 })
      .lean();

    if (!sessions.length) {
      return NextResponse.json({ success: true, threads: [] }, { status: 200 });
    }

    const byUser = new Map<string, any>();
    for (const session of sessions as any[]) {
      const isClient = String(session.clientId?._id || '') === auth.userId;
      const otherUser = isClient ? session.choreographerId : session.clientId;
      const otherUserId = String(otherUser?._id || '');
      if (!otherUserId) continue;
      const previous = byUser.get(otherUserId);
      if (
        !previous ||
        new Date(session.updatedAt || session.createdAt || 0).getTime() >
          new Date(previous.recentSession?.updatedAt || previous.recentSession?.createdAt || 0).getTime()
      ) {
        byUser.set(otherUserId, {
          otherUser: {
            id: otherUserId,
            fullName: otherUser?.fullName || 'User',
            profileImage: otherUser?.profileImage || '',
            role: otherUser?.role || (isClient ? 'choreographer' : 'client'),
          },
          recentSession: {
            id: String(session._id),
            status: session.status,
            paymentStatus: session.paymentStatus || 'unpaid',
            date: session.date || '',
            time: session.time || '',
            updatedAt: session.updatedAt,
            createdAt: session.createdAt,
          },
        });
      }
    }

    const counterpartIds = Array.from(byUser.keys());
    const conversationKeys = counterpartIds.map((otherUserId) => makeConversationKey(auth.userId, otherUserId));

    const messages = await Message.find({
      $or: [
        { conversationKey: { $in: conversationKeys } },
        { fromUserId: auth.userId, toUserId: { $in: counterpartIds } },
        { fromUserId: { $in: counterpartIds }, toUserId: auth.userId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestMessageByConversation = new Map<string, any>();
    for (const message of messages) {
      const fromUserId = String(message.fromUserId || '');
      const toUserId = String(message.toUserId || '');
      const otherUserId = fromUserId === auth.userId ? toUserId : fromUserId;
      const key = makeConversationKey(auth.userId, otherUserId);
      if (key && !latestMessageByConversation.has(key)) {
        latestMessageByConversation.set(key, message);
      }
    }

    const unreadMessages = await Message.find({
      fromUserId: { $in: counterpartIds },
      toUserId: auth.userId,
      read: false,
    })
      .select('fromUserId')
      .lean();

    const unreadCountByConversation = new Map<string, number>();
    for (const unread of unreadMessages) {
      const key = makeConversationKey(auth.userId, String(unread.fromUserId || ''));
      if (!key) continue;
      unreadCountByConversation.set(key, (unreadCountByConversation.get(key) || 0) + 1);
    }

    const threads = Array.from(byUser.entries())
      .map(([otherUserId, data]) => {
        const key = makeConversationKey(auth.userId, otherUserId);
        const latestMessage = latestMessageByConversation.get(key);
        const lastActivity =
          latestMessage?.createdAt ||
          data?.recentSession?.updatedAt ||
          data?.recentSession?.createdAt ||
          new Date(0);

        return {
          threadId: otherUserId,
          otherUser: data.otherUser,
          recentSession: {
            id: data?.recentSession?.id || '',
            status: data?.recentSession?.status || '',
            paymentStatus: data?.recentSession?.paymentStatus || 'unpaid',
            date: data?.recentSession?.date || '',
            time: data?.recentSession?.time || '',
          },
          lastMessage: latestMessage
            ? {
                id: String(latestMessage._id),
                text: String(latestMessage.text || ''),
                createdAt: latestMessage.createdAt,
                fromUserId: String(latestMessage.fromUserId || ''),
              }
            : null,
          unreadCount: unreadCountByConversation.get(key) || 0,
          lastActivity,
        };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    return NextResponse.json({ success: true, threads }, { status: 200 });
  } catch (error: any) {
    console.error('Inbox threads error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
