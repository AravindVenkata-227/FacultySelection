
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // This will trigger initialization

export async function GET(request: NextRequest) {
  console.log('[API Test Firebase Init] Route called.');
  if (!adminDb) {
    console.error('[API Test Firebase Init] adminDb is not initialized. Firebase Admin SDK setup failed.');
    return NextResponse.json({ 
      status: 'Firebase Admin SDK NOT INITIALIZED',
      message: 'adminDb object is undefined. Check server logs for initialization errors in firebase-admin.ts.',
    }, { status: 500 });
  }

  console.log('[API Test Firebase Init] adminDb seems to be initialized. Attempting a test Firestore read.');
  try {
    // Attempt a very simple read operation.
    // We try to get a document that likely doesn't exist, just to test connectivity.
    const testDocRef = adminDb.collection('__test_collection__').doc('__test_doc__');
    await testDocRef.get(); 
    
    console.log('[API Test Firebase Init] Test Firestore read operation completed (it does not matter if the doc exists or not, the attempt itself is the test).');
    return NextResponse.json({ 
      status: 'Firebase Admin SDK INITIALIZED and TEST READ SUCCEEDED (or at least did not throw during the attempt)',
      adminDbStatus: 'Available',
    }, { status: 200 });
  } catch (error: any) {
    console.error('[API Test Firebase Init] Error during test Firestore read operation:', error.message, error.stack);
    return NextResponse.json({ 
      status: 'Firebase Admin SDK INITIALIZED but TEST READ FAILED',
      adminDbStatus: 'Available, but Firestore operation failed',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
