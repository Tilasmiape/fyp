import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User, { IUser } from '@/models/User';
import { requireStripe } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('authToken')?.value ||
      request.headers.get('Authorization')?.substring(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== 'choreographer') {
      return NextResponse.json({ error: 'Only choreographers can connect Stripe' }, { status: 403 });
    }

    await connectDB();
    const user = await User.findById(payload.userId) as IUser | null;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const stripe = requireStripe();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Create Connect account if it doesn't exist yet
    if (!user.stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_profile: {
          url: appUrl, // ✅ required by Stripe
        },
        metadata: { userId: String(user._id) },
      });
      user.stripeAccountId = account.id;
      await user.save();
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId!,
      refresh_url: `${appUrl}/choreographer/profile?stripe=refresh`,
      return_url: `${appUrl}/choreographer/profile?stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ success: true, url: accountLink.url });
  } catch (error: any) {
    console.error('[connect/onboard]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}