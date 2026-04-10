import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { otpStore } from '../send-code/route';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const key = email.toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Increment attempt counter
    record.attempts += 1;
    if (record.attempts > MAX_OTP_ATTEMPTS) {
      otpStore.delete(key);
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }
    otpStore.set(key, record);

    if (record.code !== code.trim()) {
      const remaining = MAX_OTP_ATTEMPTS - record.attempts;
      return NextResponse.json({
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.',
      }, { status: 400 });
    }

    // Code is correct — sign the user in
    otpStore.delete(key);
    await connectDB();
    const user = await User.findOne({ email: key }).lean();

    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const token = jwt.sign(
      { userId: (user as any)._id.toString(), email: (user as any).email, role: (user as any).role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        _id: (user as any)._id.toString(),
        fullName: (user as any).fullName,
        email: (user as any).email,
        role: (user as any).role,
      },
    }, { status: 200 });

    response.cookies.set('authToken', token, {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err: any) {
    console.error('[verify-code] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
