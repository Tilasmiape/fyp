import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return generic message to avoid email enumeration
      return NextResponse.json({ success: true, message: 'If that email exists, the password has been updated.' }, { status: 200 });
    }

    user.password = newPassword;
    await user.save();

    return NextResponse.json({ success: true, message: 'Password updated successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('[forgot-password] error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
