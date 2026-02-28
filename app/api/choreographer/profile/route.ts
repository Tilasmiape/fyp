import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
const MAX_VIDEOS = 3;

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
    await connectDB();
    const auth = getAuthPayload(request);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(auth.userId).select(
      'fullName email phoneNumber bio pricePerSession danceStyles profileImage danceVideos role'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
          name: user.fullName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          bio: user.bio || '',
          pricePerSession: user.pricePerSession || 0,
          danceStyles: user.danceStyles || [],
          profileImage: user.profileImage || '',
          videos: (user.danceVideos || []).map((video: any) => ({
            id: video.id,
            url: video.url,
            title: video.title,
            description: video.description || '',
            uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get choreographer profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuthPayload(request);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      bio,
      pricePerSession,
      danceStyles,
      profileImage,
      videos,
    } = body || {};

    if (!Array.isArray(videos)) {
      return NextResponse.json({ error: 'Videos must be an array' }, { status: 400 });
    }

    if (videos.length > MAX_VIDEOS) {
      return NextResponse.json({ error: `Maximum ${MAX_VIDEOS} videos allowed` }, { status: 400 });
    }

    const normalizedVideos = videos.map((video: any) => ({
      id: String(video.id || Date.now()),
      url: String(video.url || ''),
      title: String(video.title || '').trim(),
      description: String(video.description || '').trim(),
      uploadedAt: video.uploadedAt ? new Date(video.uploadedAt) : new Date(),
    }));

    const hasInvalidVideo = normalizedVideos.some((video: any) => !video.url || !video.title);
    if (hasInvalidVideo) {
      return NextResponse.json({ error: 'Each video requires url and title' }, { status: 400 });
    }

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.fullName = name ?? user.fullName;
    user.email = email ? String(email).toLowerCase() : user.email;
    user.phoneNumber = phone ?? user.phoneNumber;
    user.bio = bio ?? user.bio;
    user.pricePerSession = Number.isFinite(pricePerSession) ? Number(pricePerSession) : user.pricePerSession;
    user.danceStyles = Array.isArray(danceStyles) ? danceStyles : user.danceStyles;
    user.profileImage = profileImage ?? user.profileImage;
    user.danceVideos = normalizedVideos;

    await user.save();

    return NextResponse.json(
      {
        success: true,
        profile: {
          name: user.fullName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          bio: user.bio || '',
          pricePerSession: user.pricePerSession || 0,
          danceStyles: user.danceStyles || [],
          profileImage: user.profileImage || '',
          videos: (user.danceVideos || []).map((video: any) => ({
            id: video.id,
            url: video.url,
            title: video.title,
            description: video.description || '',
            uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update choreographer profile error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
