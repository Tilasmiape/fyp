import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import Payment from '@/models/Payment';

export const runtime = 'nodejs';

/**
 * GET /api/admin/payments
 * View all payments in MongoDB "payments" collection
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getValidatedSession('super-admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filter: Record<string, string> = {};

    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('sessionId', 'date time total status sessionStatus')
      .populate('clientId', 'fullName email')
      .populate('choreographerId', 'fullName email')
      .populate('payoutId', 'status payoutDate amount')
      .sort({ createdAt: -1 })
      .limit(100);

    const stats = {
      total: await Payment.countDocuments(filter),
      unpaid: await Payment.countDocuments({ ...filter, status: 'unpaid' }),
      pending: await Payment.countDocuments({ ...filter, status: 'pending' }),
      paid: await Payment.countDocuments({ ...filter, status: 'paid' }),
      failed: await Payment.countDocuments({ ...filter, status: 'failed' }),
      refunded: await Payment.countDocuments({ ...filter, status: 'refunded' }),
      partiallyRefunded: await Payment.countDocuments({ ...filter, status: 'partially-refunded' }),
      totalAmountInSmallestUnit: await Payment.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    };

    return NextResponse.json(
      {
        success: true,
        collection: 'payments',
        database: process.env.MONGO_URI ? 'Connected' : 'Not connected',
        stats,
        payments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments', details: error?.message || error }, { status: 500 });
  }
}

/**
 * POST /api/admin/payments/test
 * Create a test payment to verify MongoDB connection
 */
export async function POST(_request: NextRequest) {
  try {
    const { user } = await getValidatedSession('super-admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const fakeSessionId = new mongoose.Types.ObjectId();
    const testPayment = new Payment({
      sessionId: fakeSessionId,
      clientId: user.userId,
      choreographerId: user.userId,
      amount: 100000,
      currency: 'usd',
      status: 'pending',
      metadata: {
        date: new Date().toISOString().slice(0, 10),
        time: '10:00 AM',
        total: 1000,
        sessionStatus: 'reserved',
      },
    });

    await testPayment.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Test payment created in "payments" collection',
        payment: testPayment,
        mongodbTip: 'View in MongoDB Compass: stepoutstudio -> payments',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating test payment:', error);
    return NextResponse.json({ error: 'Failed to create test payment', details: error?.message || error }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/payments/test
 * Clear all test payments
 */
export async function DELETE(_request: NextRequest) {
  try {
    const { user } = await getValidatedSession('super-admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const result = await Payment.deleteMany({
      'metadata.time': '10:00 AM',
      'metadata.total': 1000,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${result.deletedCount} test payments`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting payments:', error);
    return NextResponse.json({ error: 'Failed to delete payments', details: error?.message || error }, { status: 500 });
  }
}


