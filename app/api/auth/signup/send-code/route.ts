import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { sendSignupOtpEmail } from '@/lib/email';
import { SignupPayload, validateSignupPayload } from '@/lib/auth/signup-payload';
import { clearSignupOtp, createSignupOtp, normalizeEmail } from '@/lib/auth/signup-verification';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupPayload;
    const validationError = validateSignupPayload(body);
    if (validationError) {
      const status = validationError === 'Cannot create super-admin via signup' ? 403 : 400;
      return NextResponse.json({ error: validationError }, { status });
    }

    const normalizedEmail = normalizeEmail(body.email);
    const normalizedPhone = body.phoneNumber ? String(body.phoneNumber).trim() : '';

    await connectDB();

    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, ...(normalizedPhone ? [{ phoneNumber: normalizedPhone }] : [])],
    });

    if (userExists) {
      if (userExists.email === normalizedEmail) {
        if (body.role === 'choreographer' && userExists.role === 'choreographer') {
          if (userExists.approvalStatus === 'pending') {
            return NextResponse.json({ error: 'A signup request with this email is already pending admin approval' }, { status: 400 });
          }
          if (userExists.approvalStatus === 'rejected') {
            return NextResponse.json({ error: 'This choreographer request was rejected. Please contact admin or use a different email.' }, { status: 400 });
          }
          if (userExists.approvalStatus === 'approved') {
            return NextResponse.json({ error: 'This choreographer account is already approved. Please sign in instead.' }, { status: 400 });
          }
        }
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      if (normalizedPhone && userExists.phoneNumber === normalizedPhone) {
        return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
      }
    }

    const otpCode = createSignupOtp(normalizedEmail, {
      fullName: body.fullName.trim(),
      email: normalizedEmail,
      password: body.password,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      phoneNumber: normalizedPhone || undefined,
      location: body.location?.trim() || '',
      role: body.role as 'client' | 'choreographer',
      danceStyles: body.role === 'choreographer' ? (body.danceStyles || []) : [],
      certificatePhoto: body.role === 'choreographer' ? (body.certificatePhoto || '') : '',
    });

    const sent = await sendSignupOtpEmail({
      to: normalizedEmail,
      fullName: body.fullName,
      code: otpCode,
      expiresInMinutes: 10,
    });

    if (!sent.sent) {
      clearSignupOtp(normalizedEmail);
      return NextResponse.json({ error: 'Unable to send verification code email right now.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'A verification code has been sent to your email.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[signup/send-code] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
