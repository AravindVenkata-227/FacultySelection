
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSession } from '@/lib/data';
import crypto from 'crypto';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_DURATION_HOURS = 24; // Session duration in hours

export async function POST(request: NextRequest) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('Admin credentials are not set in environment variables.');
    return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

      const sessionResult = await createAdminSession(sessionId, 'admin_user', expiresAt);

      if (!sessionResult.success) {
        console.error('Failed to create admin session in Firestore:', sessionResult.error);
        return NextResponse.json({ message: 'Login failed due to a server error.' }, { status: 500 });
      }

      const cookieStore = cookies();
      cookieStore.set('admin-auth-token', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_DURATION_HOURS * 60 * 60, // maxAge in seconds
        sameSite: 'lax', // Or 'strict'
      });
      return NextResponse.json({ message: 'Login successful' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'An internal error occurred' }, { status: 500 });
  }
}

    