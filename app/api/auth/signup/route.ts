import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { fullName, email, password, dateOfBirth, phoneNumber, role, location, certificatePhoto } = body;

    // do not allow clients to register as super-admin via signup
    if (role === 'super-admin') {
      return NextResponse.json(
        { error: 'Cannot create super-admin via signup' },
        { status: 403 }
      );
    }


    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Require certificate photo for choreographers
    if (role === 'choreographer' && !certificatePhoto) {
      return NextResponse.json(
        { error: 'Dance certificate photo is required for choreographers' },
        { status: 400 }
      );
    }

    const userExists = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(phoneNumber ? [{ phoneNumber }] : [])
      ]
    });

    if (userExists) {
      if (userExists.email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      if (phoneNumber && userExists.phoneNumber === phoneNumber) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 400 }
        );
      }
    }

    const newUser = await User.create({
      fullName,
      email: email.toLowerCase(),
      password, // Note: Should hash password in production
      dateOfBirth,
      phoneNumber,
      location: location ? String(location).trim() : '',
      role,
      danceStyles: role === 'choreographer' ? body.danceStyles : [],
      certificatePhoto: role === 'choreographer' ? certificatePhoto : '',
    });

    console.log('✓ User registered in DB:', newUser.email);

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role
        },
        token
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
