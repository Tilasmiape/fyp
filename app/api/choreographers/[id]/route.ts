import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';
import Feedback from '@/models/Feedback';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Choreographer id is required' }, { status: 400 });
    }

    await connectDB();

    const choreographer = await User.findOne({
      _id: id,
      role: 'choreographer',
      status: { $ne: 'deleted' },
    }).select(
      'fullName email bio location pricePerSession groupSessionPriceMultiplier danceStyles profileImage danceVideos approvalStatus'
    );

    if (!choreographer) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }

    const availabilityTimes = await Availability.find({ choreographerId: id })
      .select('date timeSlots -_id')
      .sort({ date: 1 })
      .lean();

    const feedbacks = await Feedback.find({ reciver_id: id })
      .sort({ created_at: -1 })
      .limit(100)
      .populate('sender_id', 'fullName profileImage')
      .lean();

    return NextResponse.json(
      {
        success: true,
        choreographer: {
          id: String(choreographer._id),
          name: choreographer.fullName || '',
          email: choreographer.email || '',
          bio: choreographer.bio || '',
          location: choreographer.location || '',
          pricePerSession: Number(choreographer.pricePerSession || 0),
          groupSessionPriceMultiplier: Number(choreographer.groupSessionPriceMultiplier || 1.3),
          danceStyles: Array.isArray(choreographer.danceStyles) ? choreographer.danceStyles : [],
          profileImage: choreographer.profileImage || '',
          approvalStatus: choreographer.approvalStatus || undefined,
          availabilityTimes: Array.isArray(availabilityTimes) ? availabilityTimes : [],
          videos: (choreographer.danceVideos || [])
            .filter((video: any) => video.status === 'approved')
            .map((video: any) => ({
              id: video.id,
              url: video.url,
              title: video.title,
              description: video.description || '',
              uploadedAt: video.uploadedAt
                ? new Date(video.uploadedAt).toISOString()
                : new Date().toISOString(),
            })),
        },
        reviews: feedbacks.map((feedback: any) => ({
          feedback_id: feedback.feedback_id,
          comment: feedback.comment || '',
          rating: typeof feedback.rating === 'number' ? feedback.rating : undefined,
          created_at: feedback.created_at,
          sender: feedback.sender_id
            ? {
                id: String(feedback.sender_id._id || ''),
                name: feedback.sender_id.fullName || 'Client',
                profileImage: feedback.sender_id.profileImage || '',
              }
            : undefined,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch choreographer by id error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
