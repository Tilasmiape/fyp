import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Availability from '@/models/Availability';
import Feedback from '@/models/Feedback';
import mongoose from 'mongoose';

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
    }).select('fullName email bio location pricePerSession groupSessionPriceMultiplier danceStyles profileImage danceVideos approvalStatus status');

    if (!user) {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }
    if (user.status && user.status !== 'active') {
      return NextResponse.json({ error: 'Choreographer not found' }, { status: 404 });
    }

    // Fetch availability from separate collection
    const availabilityDocs = await Availability.find({ choreographerId: id }).select('date timeSlots -_id');

    const reviewIdCandidates: Array<string | mongoose.Types.ObjectId> = [id];
    if (mongoose.Types.ObjectId.isValid(id)) {
      reviewIdCandidates.push(new mongoose.Types.ObjectId(id));
    }

    const feedbacks = await Feedback.find({ reciver_id: { $in: reviewIdCandidates } })
      .sort({ created_at: -1 })
      .limit(20)
      .populate('sender_id', 'fullName profileImage');

    const payload = {
      id: user._id,
      name: user.fullName || '',
      email: user.email || '',
      bio: user.bio || '',
      location: user.location || '',
      pricePerSession: user.pricePerSession || 0,
      groupSessionPriceMultiplier: user.groupSessionPriceMultiplier || 1.3,
      danceStyles: user.danceStyles || [],
      profileImage: user.profileImage || '',
      availabilityTimes: availabilityDocs,
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

    return NextResponse.json({ success: true, choreographer: payload, reviews: feedbacks.map((f: any) => ({ feedback_id: f.feedback_id, comment: f.comment, rating: f.rating ?? undefined, created_at: f.created_at, sender: f.sender_id ? { id: f.sender_id._id, name: f.sender_id.fullName || 'Client', profileImage: f.sender_id.profileImage || '' } : undefined })) }, { status: 200 });
  } catch (error) {
    console.error('Fetch choreographer by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}







// TEST_WRITE
