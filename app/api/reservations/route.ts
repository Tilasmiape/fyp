import { NextRequest, NextResponse } from 'next/server';
import { GET as sessionsGET, POST as sessionsPOST } from '@/app/api/sessions/route';

async function normalizeReservationsPayload(response: NextResponse | Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response;
  }

  const payload = await response.json();
  if (
    payload &&
    Array.isArray(payload.sessions) &&
    typeof payload.reservations === 'undefined'
  ) {
    payload.reservations = payload.sessions;
  }

  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: NextRequest) {
  const response = await sessionsGET(request);
  return normalizeReservationsPayload(response);
}

export async function POST(request: NextRequest) {
  return sessionsPOST(request);
}
