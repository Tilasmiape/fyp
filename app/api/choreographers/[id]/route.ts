import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { resolveAvailability } from '@/lib/availability';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const user = await User.findOne({
      _id: id,
      role: 'choreographer',
    }).select('fullName email bio location pricePerSession danceStyles profileImage danceVideos approvalStatus status availabilities');

    if (!user) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }
    if (user.status && user.status !== 'active') {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }

    const payload = {
      id: user._id,
      name: user.fullName || '',
      email: user.email || '',
      bio: user.bio || '',
      location: user.location || '',
      pricePerSession: user.pricePerSession || 0,
      danceStyles: user.danceStyles || [],
      profileImage: user.profileImage || '',
      availabilities: user.availabilities,
      availabilityTimes: resolveAvailability(user.availabilities),
      videos: (user.danceVideos || [])
        .filter((v: any) => v.status === 'approved')
        .map((video: any) => ({
          id: video.id,
          url: video.url,
          title: video.title,
          description: video.description || '',
          uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
        })),
    };

    return NextResponse.json({ success: true, choreographer: payload }, { status: 200 });
  } catch (error) {
    console.error('Fetch choreographer by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}







