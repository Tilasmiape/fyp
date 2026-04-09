import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Session from '@/models/Session';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthPayload(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['client', 'choreographer'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Client id is required' }, { status: 400 });

    await connectDB();

    if (auth.role === 'client' && auth.userId !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (auth.role === 'choreographer') {
      const hasRelatedSession = await Session.exists({
        clientId: id,
        choreographerId: auth.userId,
      });
      if (!hasRelatedSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const user = await User.findOne({ _id: id, role: 'client' }).select(
      'fullName email role phoneNumber bio location profileImage'
    );
    if (!user) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: String(user._id),
          fullName: user.fullName || '',
          email: user.email || '',
          role: user.role || 'client',
          phoneNumber: user.phoneNumber || '',
          bio: user.bio || '',
          location: user.location || '',
          profileImage: user.profileImage || '',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get client profile by id error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
