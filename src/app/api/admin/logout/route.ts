
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAdminSession } from '@/lib/data';

export const dynamic = 'force-dynamic'; // Ensure the route is treated as dynamic

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('admin-auth-token')?.value;

    if (sessionId) {
      // The deleteAdminSession function will check if adminDb is initialized.
      // If not, it will log an error and return { success: false }.
      // We can proceed with clearing the cookie regardless, as it's best-effort.
      const deleteResult = await deleteAdminSession(sessionId);
      if (!deleteResult.success) {
        console.warn(`[API Admin Logout] Failed to delete session '${sessionId}' from Firestore, but proceeding to clear cookie. Error: ${deleteResult.error}`);
      }
    }
    
    cookieStore.set('admin-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, 
      sameSite: 'lax',
    });

    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  } catch (error) {
    console.error('[API Admin Logout] Unexpected error:', error);
    // Check if adminDb was the issue, though the error might be different here.
    // This is more of a general catch-all.
    return NextResponse.json({ message: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
