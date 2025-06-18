
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('admin-auth-token')?.value;
  const { pathname } = request.nextUrl;

  // If trying to access admin routes (excluding /admin/login) without auth token, redirect to login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !authToken) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access /admin/login, redirect to admin dashboard
  if (authToken && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    return NextResponse.redirect(adminUrl);
  }
  
  // Allow access to /api/admin/login and /api/admin/logout regardless of auth token state
  if (pathname.startsWith('/api/admin/login') || pathname.startsWith('/api/admin/logout')) {
    return NextResponse.next();
  }
  
  // Protect other /api/admin routes
  if (pathname.startsWith('/api/admin/') && !authToken) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }


  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
