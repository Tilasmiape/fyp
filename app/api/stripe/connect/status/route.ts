import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requireStripe } from '@/lib/stripe';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get('authToken')?.value ||
      request.headers.get('Authorization')?.substring(7);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(payload.userId).select('stripeAccountId stripeOnboarded');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.stripeAccountId) {
      return NextResponse.json({ success: true, connected: false, onboarded: false });
    }

    const stripe = requireStripe();
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const onboarded = !!(account.details_submitted && account.charges_enabled);

    if (onboarded && !user.stripeOnboarded) {
      user.stripeOnboarded = true;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      connected: true,
      onboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}