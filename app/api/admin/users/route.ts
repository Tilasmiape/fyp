import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { userId, action } = await request.json();

        if (!userId || !['suspend', 'restore', 'delete'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        if (action === 'delete') {
            const deletedUser = await User.findByIdAndDelete(userId);
            if (!deletedUser) {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { success: true, message: 'User deleted successfully' },
                { status: 200 }
            );
        }

        const status = action === 'suspend' ? 'suspended' : 'active';
        const user = await User.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: `User ${action}d successfully` },
            { status: 200 }
        );
    } catch (error) {
        console.error('Update user status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}