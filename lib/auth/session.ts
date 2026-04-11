import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { AppSessionData, SessionUser, SESSION_IDLE_EXTENSION_SECONDS, SESSION_TTL_SECONDS, UserRole, sessionConfig } from '@/lib/auth/session-config';

export async function getSession(): Promise<IronSession<AppSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, sessionConfig);
}

export function isSessionExpired(session: Pick<AppSessionData, 'expiresAt'>): boolean {
  return !session.expiresAt || Date.now() >= session.expiresAt;
}

function buildExpiryTimestamp() {
  return Date.now() + SESSION_TTL_SECONDS * 1000;
}

export async function establishSession(user: SessionUser) {
  const session = await getSession();

  session.user = user;
  if (!session.createdAt) {
    session.createdAt = Date.now();
  }
  session.expiresAt = buildExpiryTimestamp();

  await session.save();

  return {
    expiresAt: session.expiresAt,
    idleExtensionSeconds: SESSION_IDLE_EXTENSION_SECONDS,
  };
}

export async function clearSession() {
  const session = await getSession();
  await session.destroy();
}

export async function getValidatedSession(requiredRole?: UserRole) {
  const session = await getSession();

  if (!session.user || isSessionExpired(session)) {
    await session.destroy();
    return { session, user: null as SessionUser | null };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return { session, user: null as SessionUser | null };
  }

  return { session, user: session.user };
}

export async function touchSessionIfNeeded(session: IronSession<AppSessionData>) {
  if (!session.user || !session.expiresAt) {
    return;
  }

  const remainingSeconds = Math.floor((session.expiresAt - Date.now()) / 1000);
  if (remainingSeconds > SESSION_IDLE_EXTENSION_SECONDS) {
    return;
  }

  session.expiresAt = buildExpiryTimestamp();
  await session.save();
}


