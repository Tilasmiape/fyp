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

      // Optionally create the admin in the database if you want
      // await User.updateOne(
      //   { email: email.toLowerCase() },
      //   { email: email.toLowerCase(), role: 'super-admin', password },
      //   { upsert: true }
      // );

      return NextResponse.json(
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

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✓ User logged in:', user.email);

    return NextResponse.json(
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

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
