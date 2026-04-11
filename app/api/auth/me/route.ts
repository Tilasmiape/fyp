import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getValidatedSession, touchSessionIfNeeded } from '@/lib/auth/session';
import User from '@/models/User';

export async function GET(_request: NextRequest) {
  try {
    const { session, user: authUser } = await getValidatedSession();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(authUser.userId).select('fullName email role status statusReason approvalStatus');

    if (!user) {
      await session.destroy();
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

    await touchSessionIfNeeded(session);

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


