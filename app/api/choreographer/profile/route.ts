import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';
import { resolveAvailability, validateAvailabilityTimes } from '@/lib/availability';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
const MAX_VIDEOS = 3;

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

function getAuthPayload(request: NextRequest): AuthPayload | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  const token = cookies['authToken'];
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
      'fullName email phoneNumber bio location pricePerSession danceStyles profileImage danceVideos role approvalStatus'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch availability from separate collection
    const availabilityDocs = await Availability.find({ choreographerId: auth.userId }).select('date timeSlots -_id');

    return NextResponse.json(
      {
        success: true,
        profile: {
          name: user.fullName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          bio: user.bio || '',
          location: user.location || '',
          pricePerSession: user.pricePerSession || 0,
          danceStyles: user.danceStyles || [],
          profileImage: user.profileImage || '',
          approvalStatus: user.approvalStatus || undefined,
          availabilityTimes: availabilityDocs,
          videos: (user.danceVideos || []).map((video: any) => ({
            id: video.id,
            url: video.url,
            title: video.title,
            description: video.description || '',
            uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
            status: video.status,
            rejectionReason: video.rejectionReason || '',
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
      location,
      pricePerSession,
      danceStyles,
      profileImage,
      videos,
      availabilityTimes,
    } = body || {};

    let sanitizedAvailability: any[] | null = null;
    if (availabilityTimes !== undefined) {
      const normalized = Array.isArray(availabilityTimes) ? availabilityTimes : [];
      sanitizedAvailability = normalized
        .filter((d: any) => d && typeof d.date === 'string' && d.date.length > 0)
        .map((d: any) => ({
          date: String(d.date).trim(),
          timeSlots: Array.isArray(d.timeSlots)
            ? d.timeSlots
              .filter((s: any) => s && typeof s.time === 'string' && s.time.length > 0)
              .map((s: any) => ({
                time: String(s.time).trim(),
                duration: Number(s.duration) || 60,
              }))
            : [],
        }));
    }

    // If this is an availability-only update, we can be more efficient
    const isOnlyAvailability = availabilityTimes !== undefined && videos === undefined && name === undefined && bio === undefined;

    if (sanitizedAvailability !== null) {
      await Availability.deleteMany({ choreographerId: auth.userId });
      if (sanitizedAvailability.length > 0) {
        await Availability.insertMany(
          sanitizedAvailability.map((s: any) => ({ ...s, choreographerId: auth.userId }))
        );
      }
    }

    if (isOnlyAvailability) {
      const updated = await User.findById(auth.userId).select('fullName email phoneNumber bio location pricePerSession danceStyles profileImage role approvalStatus');
      if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      return NextResponse.json({
        success: true,
        profile: {
          name: updated.fullName || '',
          email: updated.email || '',
          phone: updated.phoneNumber || '',
          bio: updated.bio || '',
          location: updated.location || '',
          pricePerSession: updated.pricePerSession || 0,
          danceStyles: updated.danceStyles || [],
          profileImage: updated.profileImage || '',
          approvalStatus: updated.approvalStatus || undefined,
          availabilityTimes: sanitizedAvailability || [],
        },
      }, { status: 200 });
    }

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.fullName = name ?? user.fullName;
    user.email = email ? String(email).toLowerCase() : user.email;
    user.phoneNumber = phone ?? user.phoneNumber;
    user.bio = bio ?? user.bio;
    user.location = location ?? user.location;
    user.pricePerSession = Number.isFinite(pricePerSession) ? Number(pricePerSession) : user.pricePerSession;
    user.danceStyles = Array.isArray(danceStyles) ? danceStyles : user.danceStyles;
    user.profileImage = profileImage ?? user.profileImage;

    // Only update videos if they were explicitly provided in the request
    if (Array.isArray(videos)) {
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

      const existingVideos = new Map(
        (user.danceVideos || []).map((video: any) => [String(video.id), video])
      );
      user.danceVideos = normalizedVideos.map((video: any) => {
        const existing = existingVideos.get(String(video.id));
        return {
          ...video,
          status: (existing as any)?.status || 'pending',
          rejectionReason: (existing as any)?.rejectionReason || '',
        };
      });
    }

    await user.save();

    // Fetch latest availability for the full response
    const currentAvailability = await Availability.find({ choreographerId: auth.userId }).select('date timeSlots -_id');

    return NextResponse.json(
      {
        success: true,
        profile: {
          name: user.fullName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          bio: user.bio || '',
          location: user.location || '',
          pricePerSession: user.pricePerSession || 0,
          danceStyles: user.danceStyles || [],
          profileImage: user.profileImage || '',
          approvalStatus: user.approvalStatus || undefined,
          availabilityTimes: currentAvailability,
          videos: (user.danceVideos || []).map((video: any) => ({
            id: video.id,
            url: video.url,
            title: video.title,
            description: video.description || '',
            uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
            status: video.status,
            rejectionReason: video.rejectionReason || '',
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
