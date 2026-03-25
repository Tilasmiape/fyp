import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Get all choreographers (for filter list)
        const choreographers = await User.find({ role: 'choreographer' }).select('fullName');

        // Get all videos from choreographers
        const usersWithVideos = await User.find({
            role: 'choreographer',
        }).select('fullName email danceVideos');

        const allVideos = usersWithVideos.flatMap(user =>
            (user.danceVideos || []).map((video: any) => ({
                ...video.toObject(),
                choreographerName: user.fullName,
                choreographerEmail: user.email,
                choreographerId: user._id,
            }))
        );

        return NextResponse.json(
            { success: true, videos: allVideos, choreographers: choreographers.map(c => c.fullName).filter(Boolean) },
            { status: 200 }
        );
    } catch (error) {
        console.error('Fetch pending videos error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { choreographerId, videoId, action, reason } = await request.json();

        if (!choreographerId || !videoId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        if (action === 'reject' && (!reason || !String(reason).trim())) {
            return NextResponse.json(
                { error: 'Rejection reason is required' },
                { status: 400 }
            );
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        const rejectionReason = action === 'reject' ? String(reason).trim() : '';

        const user = await User.findOneAndUpdate(
            { _id: choreographerId, 'danceVideos.id': videoId },
            { $set: { 'danceVideos.$.status': status, 'danceVideos.$.rejectionReason': rejectionReason } },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: `Video ${action}d successfully` },
            { status: 200 }
        );
    } catch (error) {
        console.error('Update video status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
