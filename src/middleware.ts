
import { type NextRequest, NextResponse } from 'next/server';

// IMPORTANT: This middleware CANNOT import anything that uses Node.js specific APIs,
// including firebase-admin or modules that import it (like functions from src/lib/data.ts).
// Middleware runs in the Edge runtime.

export async function middleware(request: NextRequest) {
  const adminAuthTokenCookie = request.cookies.get('admin-auth-token');
  const sessionId = adminAuthTokenCookie?.value;
  const { pathname } = request.nextUrl;

  // Simplified check: only checks for the presence of the session ID in the cookie.
  // Robust validation of the sessionId (checking Firestore) must happen in your API routes
  // or server-side page logic (e.g. getServerSideProps), which run in a Node.js environment.
  const isAuthenticatedBasedOnCookiePresence = !!sessionId;

  // If trying to access admin routes (excluding /admin/login) without a cookie, redirect to login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAuthenticatedBasedOnCookiePresence) {
    const loginUrl = new URL('/admin/login', request.url);
    // console.log(`[Middleware] Admin auth cookie not found for ${pathname}, redirecting to login.`);
    return NextResponse.redirect(loginUrl);
  }

  // If a cookie exists and user is trying to access /admin/login, redirect to admin dashboard
  if (isAuthenticatedBasedOnCookiePresence && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    // console.log(`[Middleware] Admin auth cookie found, user on login page, redirecting to /admin.`);
    return NextResponse.redirect(adminUrl);
  }
  
  // Allow access to /api/admin/login regardless of auth token state (needed for login process itself)
  if (pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }
  
  // For other /api/admin routes, this middleware only checks for cookie presence.
  // The actual API route handler MUST validate the sessionId from the cookie.
  if (pathname.startsWith('/api/admin/') && !isAuthenticatedBasedOnCookiePresence) {
      // console.log(`[Middleware] Admin auth cookie not found for API access to ${pathname}.`);
      return NextResponse.json({ message: 'Authentication required (cookie missing)' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
