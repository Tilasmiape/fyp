import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const style = searchParams.get('style')?.trim().toLowerCase() || '';
    const location = searchParams.get('location')?.trim().toLowerCase() || '';

    const choreographers = await User.find({
      role: 'choreographer',
      status: { $ne: 'deleted' },
    }).select('fullName email bio location pricePerSession groupSessionPriceMultiplier danceStyles profileImage danceVideos approvalStatus');

    // Fetch all availabilities for these choreographers
    const choreographerIds = choreographers.map(c => c._id);
    const allAvailabilities = await Availability.find({ choreographerId: { $in: choreographerIds } });

    // Group availabilities by choreographerId
    const availabilityMap = allAvailabilities.reduce((acc: any, curr: any) => {
      const id = curr.choreographerId.toString();
      if (!acc[id]) acc[id] = [];
      acc[id].push({ date: curr.date, timeSlots: curr.timeSlots });
      return acc;
    }, {});

    const payload = choreographers.map((user: any) => ({
      id: user._id,
      name: user.fullName || '',
      email: user.email || '',
      bio: user.bio || '',
      location: user.location || '',
      pricePerSession: user.pricePerSession || 0,
      groupSessionPriceMultiplier: user.groupSessionPriceMultiplier || 1.3,
      danceStyles: user.danceStyles || [],
      profileImage: user.profileImage || '',
      approvalStatus: user.approvalStatus || undefined,
      availabilityTimes: availabilityMap[user._id.toString()] || [],
      videos: (user.danceVideos || [])
        .filter((v: any) => v.status === 'approved')
        .map((video: any) => ({
          id: video.id,
          url: video.url,
          title: video.title,
          description: video.description || '',
          uploadedAt: video.uploadedAt ? new Date(video.uploadedAt).toISOString() : new Date().toISOString(),
        })),
    }));

    const filtered = payload.filter(c => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        (c.bio || '').toLowerCase().includes(search);
      const matchesStyle =
        !style ||
        (c.danceStyles || []).some((s: string) => s.toLowerCase().includes(style));
      const matchesLocation =
        !location ||
        (c.location || '').toLowerCase().includes(location);
      return matchesSearch && matchesStyle && matchesLocation;
    });

    return NextResponse.json({ success: true, choreographers: filtered }, { status: 200 });
  } catch (error) {
    console.error('Fetch choreographers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

