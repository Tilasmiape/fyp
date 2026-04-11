import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { issueLegacyAuthToken } from '@/lib/auth/legacy-jwt';
import { establishSession } from '@/lib/auth/session';
import User from '@/models/User';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const MAX_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiter: key is email.toLowerCase()
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

function getAttemptRecord(email: string) {
  const key = email.toLowerCase();
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 0, lockedUntil: null });
  }
  return { key, record: loginAttempts.get(key)! };
}

function withLegacyAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('authToken', token, {
    path: '/',
    maxAge: 60 * 60 * 8,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!rawEmail || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (rawEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && password === DEFAULT_ADMIN_PASSWORD) {
      const sessionUser = {
        userId: 'fixed-admin',
        email: rawEmail,
        role: 'super-admin' as const,
      };

      await establishSession(sessionUser);

      const response = NextResponse.json(
        {
          success: true,
          user: { _id: 'fixed-admin', fullName: 'Administrator', email: rawEmail, role: 'super-admin' },
        },
        { status: 200 }
      );

      return withLegacyAuthCookie(response, issueLegacyAuthToken(sessionUser));
    }

    const { key, record } = getAttemptRecord(rawEmail);

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
          locked: true,
          lockedUntil: record.lockedUntil,
        },
        { status: 429 }
      );
    }

    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      record.count = 0;
      record.lockedUntil = null;
    }

    await connectDB();
    const user = await User.findOne({ email: rawEmail });

    if (!user || user.password !== password) {
      record.count += 1;
      const remaining = MAX_ATTEMPTS - record.count;

      if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS;
        loginAttempts.set(key, record);
        return NextResponse.json(
          {
            error: 'Too many failed attempts. Account locked for 15 minutes.',
            locked: true,
            lockedUntil: record.lockedUntil,
            attemptsUsed: record.count,
          },
          { status: 429 }
        );
      }

      loginAttempts.set(key, record);
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsUsed: record.count,
          attemptsRemaining: remaining,
          maxAttempts: MAX_ATTEMPTS,
        },
        { status: 401 }
      );
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
      const label = user.status === 'deleted' ? 'Account deleted' : 'Account suspended';
      return NextResponse.json(
        {
          error: label,
          reason: (user as any).statusReason || 'Contact support.',
          status: user.status,
        },
        { status: 403 }
      );
    }

    loginAttempts.delete(key);

    const sessionUser = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    await establishSession(sessionUser);

    const response = NextResponse.json(
      {
        success: true,
        user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
      },
      { status: 200 }
    );

    return withLegacyAuthCookie(response, issueLegacyAuthToken(sessionUser));
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


