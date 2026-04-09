import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function GET(request: NextRequest) {
  try {
    let token = request.cookies.get('authToken')?.value;

    // Fallback to Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(payload.userId).select('fullName email role status statusReason approvalStatus');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role === 'choreographer') {
      if (user.approvalStatus === 'pending') {
        return NextResponse.json(
          {
            error: 'Account pending approval',
            reason: 'Your choreographer signup request is still under review.',
            status: 'pending',
          },
          { status: 403 }
        );
      }
      if (user.approvalStatus === 'rejected') {
        return NextResponse.json(
          {
            error: 'Account rejected',
            reason: 'Your choreographer signup request was rejected.',
            status: 'rejected',
          },
          { status: 403 }
        );
      }
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
      return NextResponse.json(
        {
          error: 'Account not active',
          reason: (user as any).statusReason || '',
          status: user.status,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          fullName: user.fullName || '',
          email: user.email || '',
          role: user.role || 'client',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

