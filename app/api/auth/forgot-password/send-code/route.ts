import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { sendPasswordResetOtpEmail } from '@/lib/email';
import User from '@/models/User';

export const runtime = 'nodejs';

// In-memory OTP store: email -> { code, expiresAt, attempts }
export const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

    const normalizedEmail = String(email).toLowerCase().trim();

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail }).select('email fullName').lean();
    if (!user) {
      // Generic success to avoid enumeration
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const code = generateOTP();
    const expiresInMinutes = 10;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    otpStore.set(normalizedEmail, { code, expiresAt, attempts: 0 });

    const sent = await sendPasswordResetOtpEmail({
      to: normalizedEmail,
      fullName: (user as any).fullName || 'User',
      code,
      expiresInMinutes,
    });

    if (!sent.sent) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ error: 'Unable to send verification code email right now.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'A verification code has been sent to your email.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[send-code] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
