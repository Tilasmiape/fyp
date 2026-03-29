import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Score from '@/models/Score';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';

interface AuthPayload {
  userId: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can view scores' }, { status: 403 });
    }

    await connectDB();

    const scores = await Score.find({ client_id: payload.userId })
      .sort({ given_at: -1 })
      .limit(50)
      .populate('choreographer_id', 'fullName profileImage');

    return NextResponse.json(
      {
        success: true,
        scores: scores.map((s: any) => ({
          score_id: s.score_id,
          score: s.score,
          given_at: s.given_at,
          booking_id: s.booking_id || undefined,
          choreographer: s.choreographer_id
            ? {
                id: s.choreographer_id._id,
                name: s.choreographer_id.fullName || 'Choreographer',
                profileImage: s.choreographer_id.profileImage || '',
              }
            : undefined,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get client scores error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
