
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAdminSession } from '@/lib/data';

export const dynamic = 'force-dynamic'; // Ensure the route is treated as dynamic

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('admin-auth-token')?.value;

    if (sessionId) {
      await deleteAdminSession(sessionId);
    }
    
    // Clear the cookie by setting its Max-Age to 0 or by using delete
    // Setting it with options ensures it's cleared correctly across browsers/paths
    cookieStore.set('admin-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, 
      sameSite: 'lax',
    });
    // Alternatively, if cookies().delete() works reliably for HttpOnly cookies in your Next.js version:
    // cookieStore.delete('admin-auth-token');


    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ message: 'An internal error occurred' }, { status: 500 });
  }
}

    
