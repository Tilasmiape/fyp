import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import Payout from '@/models/Payout';

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

    const payments = await Payout.find(filter)
      .populate('choreographerId', 'fullName email')
      .populate('reservationId', 'date time total')
      .sort({ createdAt: -1 })
      .limit(100);

    const stats = {
      total: await Payout.countDocuments(filter),
      pending: await Payout.countDocuments({ ...filter, status: 'pending' }),
      processing: await Payout.countDocuments({ ...filter, status: 'processing' }),
      completed: await Payout.countDocuments({ ...filter, status: 'completed' }),
      failed: await Payout.countDocuments({ ...filter, status: 'failed' }),
      totalAmount: await Payout.aggregate([
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

    const testPayment = new Payout({
      choreographerId: user.userId,
      reservationId: new mongoose.Types.ObjectId(),
      amount: 1000,
      currency: 'usd',
      status: 'pending',
      payoutDate: new Date(),
      metadata: {
        choreographerName: 'Test Choreographer',
        clientName: 'Test Client',
        sessionDate: new Date().toISOString(),
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

    const result = await Payout.deleteMany({ 'metadata.clientName': 'Test Client' });

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


