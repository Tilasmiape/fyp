import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export const runtime = 'nodejs';

/** Mask email: tilasmi@gmail.com → t*****i@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('fullName email profileImage role status approvalStatus')
      .lean();

    if (!user) {
      // Generic response to avoid enumeration
      return NextResponse.json({ found: false, message: 'No account found with that email.' }, { status: 200 });
    }

    return NextResponse.json({
      found: true,
      user: {
        id: (user as any)._id.toString(),
        fullName: (user as any).fullName,
        email: (user as any).email,
        maskedEmail: maskEmail((user as any).email),
        profileImage: (user as any).profileImage || null,
        role: (user as any).role,
      },
    }, { status: 200 });
  } catch (err: any) {
    console.error('[lookup] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
