import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/payouts
 * 
 * Automated payout processor that runs every Friday at 9 AM UTC
 * Configure in Vercel: https://vercel.com/docs/crons
 * 
 * Cron schedule: 0 9 * * 5 (Friday 9 AM UTC)
 * 
 * vercel.json configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/payouts",
 *     "schedule": "0 9 * * 5"
 *   }]
 * }
 */

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verify request is from Vercel cron service
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const adminApiKey = process.env.ADMIN_API_KEY || '';

    if (!adminApiKey) {
      console.error('[CRON] ADMIN_API_KEY not configured');
      return NextResponse.json(
        { error: 'Admin API key not configured' },
        { status: 500 }
      );
    }

    // Call the payout processor with admin API key
    const response = await fetch(`${appUrl}/api/admin/payouts/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminApiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Payout processing failed:', error);
      return NextResponse.json(
        { error: 'Payout processing failed', details: error },
        { status: 500 }
      );
    }

    const result = await response.json();

    console.log(`[CRON] Friday payout run completed:`, {
      timestamp: new Date().toISOString(),
      processed: result.summary?.processed,
      failed: result.summary?.failed,
    });

    return NextResponse.json({
      success: true,
      message: 'Friday payout run completed',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[CRON] Payout cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error?.message },
      { status: 500 }
    );
  }
}
