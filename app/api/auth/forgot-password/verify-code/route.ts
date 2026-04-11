import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { issueLegacyAuthToken } from '@/lib/auth/legacy-jwt';
import { establishSession } from '@/lib/auth/session';
import User from '@/models/User';
import { otpStore } from '../send-code/route';

export const runtime = 'nodejs';

const MAX_OTP_ATTEMPTS = 5;

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
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const key = String(email).toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    record.attempts += 1;
    if (record.attempts > MAX_OTP_ATTEMPTS) {
      otpStore.delete(key);
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }
    otpStore.set(key, record);

    if (record.code !== String(code).trim()) {
      const remaining = MAX_OTP_ATTEMPTS - record.attempts;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many incorrect attempts. Please request a new code.',
        },
        { status: 400 }
      );
    }

    otpStore.delete(key);
    await connectDB();
    const user = await User.findOne({ email: key }).lean();

    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const sessionUser = {
      userId: (user as any)._id.toString(),
      email: (user as any).email,
      role: (user as any).role,
    };

    await establishSession(sessionUser);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: (user as any)._id.toString(),
          fullName: (user as any).fullName,
          email: (user as any).email,
          role: (user as any).role,
        },
      },
      { status: 200 }
    );

    return withLegacyAuthCookie(response, issueLegacyAuthToken(sessionUser));
  } catch (err: any) {
    console.error('[verify-code] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}


