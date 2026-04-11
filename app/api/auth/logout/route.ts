import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

export async function POST() {
  await clearSession();

  const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

  // Clear legacy cookies during migration.
  response.cookies.delete('authToken');
  response.cookies.delete('authTokenPublic');

  return response;
}


