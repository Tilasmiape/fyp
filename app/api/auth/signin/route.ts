import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

// optional hard‑coded admin credentials; set via env vars or fallback to defaults
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // --- special case: fixed super-admin credentials (no signup required) ---
    if (
      email === DEFAULT_ADMIN_EMAIL &&
      password === DEFAULT_ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { userId: 'fixed-admin', email, role: 'super-admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = NextResponse.json(
        {
          success: true,
          user: {
            _id: 'fixed-admin',
            fullName: 'Administrator',
            email,
            role: 'super-admin',
          },
          token,
        },
        { status: 200 }
      );

      response.cookies.set('authToken', token, {
        path: '/',
        maxAge: 86400, // 24 hours
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    }

    await connectDB();
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Simple password check (plain text for now)
    // In production, use bcrypt.compare(password, user.password)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.role === 'choreographer') {
      if (user.approvalStatus === 'pending') {
        return NextResponse.json(
          {
            error: 'Account pending approval',
            reason: 'Your choreographer signup request is still under review. You can sign in after admin approval.',
            status: 'pending',
          },
          { status: 403 }
        );
      }

      if (user.approvalStatus === 'rejected') {
        return NextResponse.json(
          {
            error: 'Account rejected',
            reason: 'Your choreographer signup request was rejected. You cannot sign in with this account.',
            status: 'rejected',
          },
          { status: 403 }
        );
      }
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      const reason = (user as any).statusReason || '';
      const label = user.status === 'deleted' ? 'Account deleted' : 'Account suspended';
      return NextResponse.json(
        {
          error: label,
          reason: reason || 'Please contact support for more information.',
          status: user.status,
        },
        { status: 403 }
      );
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✓ User logged in:', user.email);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        },
        token
      },
      { status: 200 }
    );

    response.cookies.set('authToken', token, {
      path: '/',
      maxAge: 86400, // 24 hours
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
