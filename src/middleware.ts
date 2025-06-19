
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/data'; // We need this to validate the session

export async function middleware(request: NextRequest) {
  const adminAuthTokenCookie = request.cookies.get('admin-auth-token');
  const sessionId = adminAuthTokenCookie?.value;
  const { pathname } = request.nextUrl;

  // Initialize isAuthenticated to false
  let isAuthenticated = false;

  // Only attempt to validate session if a sessionId exists
  if (sessionId) {
    try {
      const session = await getAdminSession(sessionId); // This can throw if lib/data.ts or lib/firebase.ts fails at import
      if (session && session.expiresAt.toDate() > new Date()) {
        isAuthenticated = true;
      }
    } catch (error) {
      // Log error if session validation fails, but don't break middleware
      // This can happen if firebase.ts fails to initialize due to Edge Runtime issues with Node.js APIs
      console.error('[Middleware] Error validating admin session:', error);
      // Keep isAuthenticated as false
    }
  }


  // If trying to access admin routes (excluding /admin/login) without a valid session, redirect to login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', request.url);
    console.log(`[Middleware] Unauthorized access to ${pathname}, redirecting to login.`);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access /admin/login, redirect to admin dashboard
  if (isAuthenticated && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    console.log(`[Middleware] Authenticated user accessing login page, redirecting to /admin.`);
    return NextResponse.redirect(adminUrl);
  }
  
  // Allow access to /api/admin/login regardless of auth token state (needed for login process itself)
  if (pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }
  
  // Protect other /api/admin routes
  if (pathname.startsWith('/api/admin/') && !isAuthenticated) {
      console.log(`[Middleware] Unauthorized API access to ${pathname}.`);
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
