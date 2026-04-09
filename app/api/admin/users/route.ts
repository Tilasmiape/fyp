import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { userId, action, reason } = await request.json();

        if (userId || !['suspend', 'delete'].includes(action)) {
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
                { success: true, message: 'User permanently deleted' },
                { status: 200 }
            );
        }

        const status = action === 'suspend' ? 'suspended' : 'active';
        const user = await User.findByIdAndUpdate(
            userId,
            {
                status,
                statusReason: action === 'suspend' ? String(reason || '') : '',
                statusUpdatedAt: new Date(),
            },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (user) {
            if (action === 'suspend') {
                const reasonText = reason ? ` Reason: ${reason}` : '';
                await Notification.create({
                    userId: user._id,
                    type: 'account-suspended',
                    title: 'Account Suspended',
                    message: `Your account has been suspended.${reasonText}`,
                    read: false,
                });
            } else {
                await Notification.create({
                    userId: user._id,
                    type: 'account-restored',
                    title: 'Account Restored',
                    message: 'Your account has been restored. You can now log in.',
                    read: false,
                });
            }
        }

        return NextResponse.json({ success: true, message: `User ${action}d successfully` }, { status: 200 });
    } catch (error) {
        console.error('Update user status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
