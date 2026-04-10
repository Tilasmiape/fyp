import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
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

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('email fullName').lean();
    if (!user) {
      // Generic success to avoid enumeration
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });

    // In production: send real email here (nodemailer/resend/etc.)
    // For development: return code in response
    console.log(`📧 OTP for ${email}: ${code}`);

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      success: true,
      message: isDev
        ? `Development mode: your code is ${code}`
        : 'A verification code has been sent to your email.',
      // Only expose code in dev mode
      ...(isDev && { devCode: code }),
    }, { status: 200 });
  } catch (err: any) {
    console.error('[send-code] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
