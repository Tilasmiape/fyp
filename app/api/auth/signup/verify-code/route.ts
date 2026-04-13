import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_SIGNUP_OTP_ATTEMPTS,
  clearSignupOtp,
  getSignupOtp,
  incrementSignupOtpAttempts,
  issueSignupVerificationToken,
  normalizeEmail,
} from '@/lib/auth/signup-verification';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = getSignupOtp(normalizedEmail);

    if (!record) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      clearSignupOtp(normalizedEmail);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
    }

    const updatedRecord = incrementSignupOtpAttempts(normalizedEmail);
    if (!updatedRecord) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (updatedRecord.attempts > MAX_SIGNUP_OTP_ATTEMPTS) {
      clearSignupOtp(normalizedEmail);
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }

    if (updatedRecord.code !== String(code).trim()) {
      const remaining = MAX_SIGNUP_OTP_ATTEMPTS - updatedRecord.attempts;
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

    clearSignupOtp(normalizedEmail);
    const verificationToken = issueSignupVerificationToken(normalizedEmail);

    return NextResponse.json(
      {
        success: true,
        verificationToken,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[signup/verify-code] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
