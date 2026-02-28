import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-later';

const roleBasedRoutes = {
  '/client/home': ['client'],
  '/choreographer/home': ['choreographer'],
  '/admin/home': ['super-admin']
};
export function proxy(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const pathname = request.nextUrl.pathname;

  const publicRoutes = ['/sign-in', '/sign-up', '/', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      email: string; 
      role: string 
    };

    for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(decoded.role)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        return NextResponse.next();
      }
    }

    return NextResponse.next();
    
  } catch (error) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};

