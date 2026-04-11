import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import { AppSessionData, SessionUser, sessionConfig, SESSION_COOKIE_NAME } from '@/lib/auth/session-config';

const pageRoleRules: Array<{ prefix: string; roles: SessionUser['role'][] }> = [
  { prefix: '/client', roles: ['client'] },
  { prefix: '/choreographer', roles: ['choreographer'] },
  { prefix: '/admin', roles: ['super-admin'] },
];

const apiRoleRules: Array<{ prefix: string; roles: SessionUser['role'][] }> = [
  { prefix: '/api/admin', roles: ['super-admin'] },
  { prefix: '/api/choreographer', roles: ['choreographer'] },
  { prefix: '/api/client', roles: ['client'] },
];

const PUBLIC_PAGE_PATHS = new Set(['/', '/signin', '/signup', '/forgot-password', '/unauthorized']);
const PUBLIC_API_PREFIXES = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/forgot-password',
];
const AUTH_REQUIRED_API_PREFIXES = ['/api/admin', '/api/choreographer', '/api/client', '/api/auth/me'];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const sealed = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sealed) return null;

  try {
    const data = await unsealData<AppSessionData>(sealed, { password: sessionConfig.password });

    if (!data.user || !data.expiresAt || Date.now() >= data.expiresAt) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return true;
  return false;
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresApiAuth(pathname: string) {
  return AUTH_REQUIRED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getRequiredRoles(pathname: string, isApi: boolean): SessionUser['role'][] | null {
  const rules = isApi ? apiRoleRules : pageRoleRules;
  const matched = rules.find((rule) => pathname.startsWith(rule.prefix));
  return matched ? matched.roles : null;
}

function unauthorizedApi(message: string, status: number) {
  return applySecurityHeaders(NextResponse.json({ error: message }, { status }));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api');

  if ((isApi && isPublicApi(pathname)) || (!isApi && isPublicPath(pathname))) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (isApi && !requiresApiAuth(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const sessionUser = await getSessionUser(request);
  const requiredRoles = getRequiredRoles(pathname, isApi);

  if (!sessionUser) {
    if (isApi) {
      return unauthorizedApi('Unauthorized', 401);
    }

    const response = NextResponse.redirect(new URL('/signin', request.url));
    return applySecurityHeaders(response);
  }

  if (requiredRoles && !requiredRoles.includes(sessionUser.role)) {
    if (isApi) {
      return unauthorizedApi('Forbidden', 403);
    }

    const response = NextResponse.redirect(new URL('/unauthorized', request.url));
    return applySecurityHeaders(response);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};


