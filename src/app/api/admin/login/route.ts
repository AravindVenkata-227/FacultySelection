
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSession } from '@/lib/data';
import crypto from 'crypto';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_DURATION_HOURS = 24; // Session duration in hours

export async function POST(request: NextRequest) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('[API Admin Login] CRITICAL: Admin credentials (ADMIN_USERNAME, ADMIN_PASSWORD) are not set in environment variables.');
    return NextResponse.json({ message: 'Server configuration error related to admin credentials. Please contact support.' }, { status: 500 });
  }

  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

      console.log(`[API Admin Login] Admin credentials match for user '${username}'. Attempting to create session with ID '${sessionId}'.`);
      const sessionResult = await createAdminSession(sessionId, 'admin_user', expiresAt);

      if (!sessionResult.success) {
        // Detailed error should have been logged by createAdminSession
        console.error(`[API Admin Login] Failed to create admin session in Firestore. Session ID attempt: '${sessionId}'. Error from data service: ${sessionResult.error}`);
        return NextResponse.json({ message: 'Login failed due to a server error (session creation). Refer to server logs for details.' }, { status: 500 });
      }

      const cookieStore = cookies();
      cookieStore.set('admin-auth-token', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_DURATION_HOURS * 60 * 60,
        sameSite: 'lax',
      });
      console.log(`[API Admin Login] Login successful for user '${username}'. Session cookie set for session ID '${sessionId}'.`);
      return NextResponse.json({ message: 'Login successful' }, { status: 200 });
    } else {
      console.warn(`[API Admin Login] Invalid login attempt for username: '${username}'.`);
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error: any) {
    console.error('[API Admin Login] Unexpected error during login processing:', error.message, error.stack);
    return NextResponse.json({ message: 'An internal error occurred during login processing. Please try again.' }, { status: 500 });
  }
}
