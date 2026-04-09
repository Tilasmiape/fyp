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

async function hasRelationship(userA: string, userB: string) {
  const relatedSession = await Session.exists({
    $or: [
      { clientId: userA, choreographerId: userB },
      { clientId: userB, choreographerId: userA },
    ],
  });
  return Boolean(relatedSession);
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthPayload(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['client', 'choreographer'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (userId === auth.userId) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    await connectDB();
    const allowed = await hasRelationship(auth.userId, userId);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const conversationKey = makeConversationKey(auth.userId, userId);
    await Message.updateMany(
      {
        $and: [
          {
            $or: [
              { fromUserId: auth.userId, toUserId: userId },
              { fromUserId: userId, toUserId: auth.userId },
            ],
          },
          {
            $or: [{ conversationKey: { $exists: false } }, { conversationKey: '' }],
          },
        ],
      } as any,
      { $set: { conversationKey } }
    );

    const messages = await Message.find({
      $or: [
        { conversationKey },
        { fromUserId: auth.userId, toUserId: userId },
        { fromUserId: userId, toUserId: auth.userId },
      ],
    })
      .populate('fromUserId', 'fullName profileImage role')
      .sort({ createdAt: 1 })
      .lean();

    await Message.updateMany(
      { fromUserId: userId, toUserId: auth.userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json(
      {
        success: true,
        messages: messages.map((message: any) => ({
          id: String(message._id),
          text: String(message.text || ''),
          createdAt: message.createdAt,
          read: Boolean(message.read),
          fromUserId: String(message.fromUserId?._id || message.fromUserId || ''),
          fromUser: {
            id: String(message.fromUserId?._id || message.fromUserId || ''),
            fullName: message.fromUserId?.fullName || 'User',
            profileImage: message.fromUserId?.profileImage || '',
            role: message.fromUserId?.role || '',
          },
          isOwn: String(message.fromUserId?._id || message.fromUserId || '') === auth.userId,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Inbox messages GET error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthPayload(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['client', 'choreographer'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const toUserId = String(body?.toUserId || '').trim();
    const text = String(body?.text || '').trim();

    if (!toUserId) return NextResponse.json({ error: 'toUserId is required' }, { status: 400 });
    if (toUserId === auth.userId) return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Message text is required' }, { status: 400 });

    await connectDB();
    const allowed = await hasRelationship(auth.userId, toUserId);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const conversationKey = makeConversationKey(auth.userId, toUserId);

    const created = await Message.create({
      conversationKey,
      fromUserId: auth.userId,
      toUserId,
      text,
      read: false,
    });

    const message = await Message.findById(created._id)
      .populate('fromUserId', 'fullName profileImage role')
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: {
          id: String(message?._id || ''),
          text: String(message?.text || ''),
          createdAt: message?.createdAt || new Date(),
          read: Boolean(message?.read),
          fromUserId: String(message?.fromUserId?._id || message?.fromUserId || auth.userId),
          fromUser: {
            id: String(message?.fromUserId?._id || message?.fromUserId || auth.userId),
            fullName: message?.fromUserId?.fullName || 'You',
            profileImage: message?.fromUserId?.profileImage || '',
            role: message?.fromUserId?.role || auth.role,
          },
          isOwn: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Inbox messages POST error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
