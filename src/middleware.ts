
import { type NextRequest, NextResponse } from 'next/server';

// IMPORTANT: DO NOT import from '@/lib/data' or any module that uses 'firebase-admin' here.
// Middleware runs in the Edge runtime and cannot use Node.js specific modules.
// Actual session validation (e.g., checking Firestore) MUST happen in your API routes or server-side page logic.

export async function middleware(request: NextRequest) {
  const adminAuthTokenCookie = request.cookies.get('admin-auth-token');
  const sessionId = adminAuthTokenCookie?.value;
  const { pathname } = request.nextUrl;

  // Simplified check: only checks for the presence of the session ID in the cookie.
  const isAuthenticatedBasedOnCookiePresence = !!sessionId;

  // If trying to access admin routes (excluding /admin/login) without a cookie, redirect to login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAuthenticatedBasedOnCookiePresence) {
    const loginUrl = new URL('/admin/login', request.url);
    // console.log(`[Middleware] Admin auth cookie not found for ${pathname}, redirecting to login.`); // Optional: for debugging
    return NextResponse.redirect(loginUrl);
  }

  // If a cookie exists and user is trying to access /admin/login, redirect to admin dashboard
  if (isAuthenticatedBasedOnCookiePresence && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    // console.log(`[Middleware] Admin auth cookie found, user on login page, redirecting to /admin.`); // Optional: for debugging
    return NextResponse.redirect(adminUrl);
  }
  
  // Allow access to /api/admin/login regardless of auth token state (needed for login process itself)
  if (pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }
  
  // Protect other /api/admin routes based on cookie presence.
  // Actual validation of the sessionId MUST be done inside these API routes using getAdminSession from @/lib/data.
  if (pathname.startsWith('/api/admin/') && !isAuthenticatedBasedOnCookiePresence) {
      // console.log(`[Middleware] Admin auth cookie not found for API access to ${pathname}.`); // Optional: for debugging
      return NextResponse.json({ message: 'Authentication required (cookie missing)' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
