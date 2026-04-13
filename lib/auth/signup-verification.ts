import crypto from 'crypto';

interface PendingSignupPayload {
  fullName: string;
  email: string;
  password: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  location?: string;
  role: 'client' | 'choreographer';
  danceStyles?: string[];
  certificatePhoto?: string;
}

interface SignupOtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  payload: PendingSignupPayload;
}

interface SignupTokenRecord {
  email: string;
  expiresAt: number;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const TOKEN_EXPIRY_MS = 10 * 60 * 1000;

export const MAX_SIGNUP_OTP_ATTEMPTS = 5;

// In-memory stores for signup verification.
const signupOtpStore = new Map<string, SignupOtpRecord>();
const signupTokenStore = new Map<string, SignupTokenRecord>();

export function normalizeEmail(email: string): string {
  return String(email).toLowerCase().trim();
}

export function createSignupOtp(email: string, payload: PendingSignupPayload): string {
  const normalizedEmail = normalizeEmail(email);
  const code = crypto.randomInt(100000, 1000000).toString();

  signupOtpStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    payload,
  });

  return code;
}

export function getSignupOtp(email: string): SignupOtpRecord | undefined {
  const normalizedEmail = normalizeEmail(email);
  return signupOtpStore.get(normalizedEmail);
}

export function incrementSignupOtpAttempts(email: string): SignupOtpRecord | undefined {
  const normalizedEmail = normalizeEmail(email);
  const existing = signupOtpStore.get(normalizedEmail);
  if (!existing) return undefined;
  existing.attempts += 1;
  signupOtpStore.set(normalizedEmail, existing);
  return existing;
}

export function clearSignupOtp(email: string): void {
  signupOtpStore.delete(normalizeEmail(email));
}

export function issueSignupVerificationToken(email: string): string {
  const token = crypto.randomBytes(24).toString('hex');
  signupTokenStore.set(token, {
    email: normalizeEmail(email),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  });
  return token;
}

export function consumeSignupVerificationToken(email: string, token: string): boolean {
  const tokenRecord = signupTokenStore.get(token);
  if (!tokenRecord) return false;

  signupTokenStore.delete(token);

  if (tokenRecord.expiresAt < Date.now()) {
    return false;
  }

  return tokenRecord.email === normalizeEmail(email);
}
