import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { issueLegacyAuthToken } from '@/lib/auth/legacy-jwt';
import { establishSession } from '@/lib/auth/session';
import { SignupPayload, validateSignupPayload } from '@/lib/auth/signup-payload';
import { consumeSignupVerificationToken, normalizeEmail } from '@/lib/auth/signup-verification';
import User from '@/models/User';

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
    await connectDB();
    const body = (await request.json()) as SignupPayload & { verificationToken?: string };
    const { fullName, email, password, dateOfBirth, phoneNumber, role, location, certificatePhoto } = body;

    const validationError = validateSignupPayload(body);
    if (validationError) {
      const status = validationError === 'Cannot create super-admin via signup' ? 403 : 400;
      return NextResponse.json({ error: validationError }, { status });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!body.verificationToken || !consumeSignupVerificationToken(normalizedEmail, body.verificationToken)) {
      return NextResponse.json({ error: 'Email verification is required before signup.' }, { status: 403 });
    }

    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, ...(phoneNumber ? [{ phoneNumber }] : [])],
    });

    if (userExists) {
      if (userExists.email === normalizedEmail) {
        if (role === 'choreographer' && userExists.role === 'choreographer') {
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

      if (phoneNumber && userExists.phoneNumber === phoneNumber) {
        return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
      }
    }

    const isChoreographer = role === 'choreographer';

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password, // TODO: hash password
      gender: body.gender,
      dateOfBirth,
      phoneNumber,
      location: location ? String(location).trim() : '',
      role,
      danceStyles: isChoreographer ? body.danceStyles : [],
      certificatePhoto: isChoreographer ? certificatePhoto : '',
      approvalStatus: isChoreographer ? 'pending' : undefined,
    });

    if (isChoreographer) {
      return NextResponse.json(
        {
          success: true,
          pendingApproval: true,
          message: 'Your sign up request is sent. You will get notified within a week.',
        },
        { status: 201 }
      );
    }

    const sessionUser = {
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    };

    await establishSession(sessionUser);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    return withLegacyAuthCookie(response, issueLegacyAuthToken(sessionUser));
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


