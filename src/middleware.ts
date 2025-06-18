
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/data'; // We need this to validate the session

export async function middleware(request: NextRequest) {
  const adminAuthTokenCookie = request.cookies.get('admin-auth-token');
  const sessionId = adminAuthTokenCookie?.value;
  const { pathname } = request.nextUrl;

  let isAuthenticated = false;
  if (sessionId) {
    const session = await getAdminSession(sessionId);
    if (session && session.expiresAt.toDate() > new Date()) {
      isAuthenticated = true;
    }
  }

  // If trying to access admin routes (excluding /admin/login) without a valid session, redirect to login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access /admin/login, redirect to admin dashboard
  if (isAuthenticated && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    return NextResponse.redirect(adminUrl);
  }
  
  // Allow access to /api/admin/login regardless of auth token state (needed for login process itself)
  if (pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }
  
  // Protect other /api/admin routes (including logout, which needs a valid session to identify which session to delete)
  if (pathname.startsWith('/api/admin/') && !isAuthenticated) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

    