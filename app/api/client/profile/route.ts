import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

function getAuthPayload(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get('authToken')?.value;
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
    if (auth.role !== 'client') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await connectDB();
    const user = await User.findById(auth.userId).select('fullName email role phoneNumber bio location profileImage');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      profile: {
        id: user._id,
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role || 'client',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        location: user.location || '',
        profileImage: user.profileImage || '',
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Get client profile error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthPayload(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const fullName = String(body?.fullName || '').trim();
    const phoneNumber = String(body?.phoneNumber || '').trim();
    const bio = String(body?.bio || '').trim();
    const location = String(body?.location || '').trim();
    const profileImageRaw = body?.profileImage;
    const profileImage = typeof profileImageRaw === 'string' ? profileImageRaw.trim() : undefined;

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.fullName = fullName;
    user.phoneNumber = phoneNumber || undefined;
    user.bio = bio || undefined;
    user.location = location || undefined;
    if (profileImage !== undefined) {
      user.profileImage = profileImage || '';
    }

    await user.save();

    return NextResponse.json({
      success: true,
      profile: {
        id: user._id,
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role || 'client',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        location: user.location || '',
        profileImage: user.profileImage || '',
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Update client profile error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
