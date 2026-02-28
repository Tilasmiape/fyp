import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

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
