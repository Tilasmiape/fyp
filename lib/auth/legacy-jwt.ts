import jwt from 'jsonwebtoken';
import { SessionUser } from '@/lib/auth/session-config';

const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_FALLBACK_JWT_SECRET = 'dev-jwt-secret-change-this-in-env';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (IS_PROD) {
    throw new Error('JWT_SECRET must be set and at least 32 characters in production.');
  }

  return DEV_FALLBACK_JWT_SECRET;
}

export function issueLegacyAuthToken(user: SessionUser) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '8h' }
  );
}


