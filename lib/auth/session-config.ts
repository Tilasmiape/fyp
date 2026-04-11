export type UserRole = 'client' | 'choreographer' | 'super-admin';

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AppSessionData {
  user?: SessionUser;
  createdAt?: number;
  expiresAt?: number;
}

const IS_PROD = process.env.NODE_ENV === 'production';
const MIN_SECRET_LENGTH = 32;
const DEV_FALLBACK_SESSION_SECRET = 'dev-only-session-secret-change-this-value-now-1234567890';

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;

  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    return secret;
  }

  if (IS_PROD) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters in production.');
  }

  console.warn('[session] Using development fallback SESSION_SECRET. Set SESSION_SECRET in .env.local.');
  return DEV_FALLBACK_SESSION_SECRET;
}

export const SESSION_COOKIE_NAME = 'step_out_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const SESSION_IDLE_EXTENSION_SECONDS = 60 * 30; // 30 minutes

export const sessionConfig = {
  password: getSessionPassword(),
  cookieName: SESSION_COOKIE_NAME,
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  },
};
