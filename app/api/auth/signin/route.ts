import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

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

function buildToken(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
}

function buildAuthResponse(payload: object, token: string, status = 200) {
  const res = NextResponse.json({ ...payload, token }, { status });
  res.cookies.set('authToken', token, {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  // Also set a non-httpOnly copy for client-side JS reads (role-based redirects)
  res.cookies.set('authTokenPublic', token, {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // ── Hard-coded admin shortcut (no rate-limit for admin) ──────────────────
    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      const token = buildToken('fixed-admin', email, 'super-admin');
      return buildAuthResponse({
        success: true,
        user: { _id: 'fixed-admin', fullName: 'Administrator', email, role: 'super-admin' },
      }, token);
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const { key, record } = getAttemptRecord(email);

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      return NextResponse.json({
        error: `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
        locked: true,
        lockedUntil: record.lockedUntil,
      }, { status: 429 });
    }

    // Reset expired lock
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      record.count = 0;
      record.lockedUntil = null;
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      record.count += 1;
      const remaining = MAX_ATTEMPTS - record.count;

      if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS;
        loginAttempts.set(key, record);
        return NextResponse.json({
          error: 'Too many failed attempts. Account locked for 15 minutes.',
          locked: true,
          lockedUntil: record.lockedUntil,
          attemptsUsed: record.count,
        }, { status: 429 });
      }

      loginAttempts.set(key, record);
      return NextResponse.json({
        error: 'Invalid email or password',
        attemptsUsed: record.count,
        attemptsRemaining: remaining,
        maxAttempts: MAX_ATTEMPTS,
      }, { status: 401 });
    }

    // ── Choreographer approval gate ───────────────────────────────────────────
    if (user.role === 'choreographer') {
      if (user.approvalStatus === 'pending') {
        return NextResponse.json({
          error: 'Account pending approval',
          reason: 'Your choreographer signup request is still under review.',
          status: 'pending',
        }, { status: 403 });
      }
      if (user.approvalStatus === 'rejected') {
        return NextResponse.json({
          error: 'Account rejected',
          reason: 'Your choreographer signup request was rejected.',
          status: 'rejected',
        }, { status: 403 });
      }
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      const label = user.status === 'deleted' ? 'Account deleted' : 'Account suspended';
      return NextResponse.json({
        error: label,
        reason: (user as any).statusReason || 'Contact support.',
        status: user.status,
      }, { status: 403 });
    }

    // ── Success — reset attempt counter ───────────────────────────────────────
    loginAttempts.delete(key);

    const token = buildToken(user._id.toString(), user.email, user.role);
    console.log('✓ User logged in:', user.email);

    return buildAuthResponse({
      success: true,
      user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    }, token);

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
