import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // In a real app, you would check for admin authentication here
        // const token = request.cookies.get('authToken');
        // ... verify token and check role ...

        const users = await User.find({}).select('-password').sort({ createdAt: -1 });

        return NextResponse.json(
            { success: true, count: users.length, users },
            { status: 200 }
        );
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const { fullName, email, password, role, phoneNumber, bio, danceStyles, pricePerSession } = await request.json();

        if (!fullName || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            role,
            phoneNumber,
            bio,
            danceStyles: danceStyles || [],
            pricePerSession: pricePerSession || 0,
            approvalStatus: role === 'choreographer' ? 'pending' : undefined,
        });

        await newUser.save();

        const { password: _, ...userResponse } = newUser.toObject();

        return NextResponse.json(
            { success: true, user: userResponse },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const { id, fullName, email, role, phoneNumber, bio, danceStyles, pricePerSession, status, approvalStatus, statusReason } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (bio !== undefined) updateData.bio = bio;
        if (danceStyles) updateData.danceStyles = danceStyles;
        if (pricePerSession !== undefined) updateData.pricePerSession = pricePerSession;
        if (status !== undefined) {
            updateData.status = status;
            updateData.statusUpdatedAt = new Date();
            if (statusReason !== undefined) {
                updateData.statusReason = String(statusReason || '');
            } else if (status === 'active') {
                updateData.statusReason = '';
            }
        }
        if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;

        const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (status !== undefined && user) {
            const reasonText = updateData.statusReason ? ` Reason: ${updateData.statusReason}` : '';
            if (status === 'suspended') {
                await Notification.create({
                    userId: user._id,
                    type: 'account-suspended',
                    title: 'Account Suspended',
                    message: `Your account has been suspended.${reasonText}`,
                    read: false,
                });
            } else if (status === 'active') {
                await Notification.create({
                    userId: user._id,
                    type: 'account-restored',
                    title: 'Account Restored',
                    message: 'Your account has been restored. You can now log in.',
                    read: false,
                });
            }
        }

        return NextResponse.json({ success: true, user }, { status: 200 });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { id, reason } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const user = await User.findByIdAndUpdate(
            id,
            { status: 'deleted', statusReason: String(reason || ''), statusUpdatedAt: new Date() },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const reasonText = reason ? ` Reason: ${reason}` : '';
        await Notification.create({
            userId: user._id,
            type: 'account-deleted',
            title: 'Account Deleted',
            message: `Your account has been deleted by admin.${reasonText}`,
            read: false,
        });

        return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
