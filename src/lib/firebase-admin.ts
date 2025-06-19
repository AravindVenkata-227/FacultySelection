
import * as admin from 'firebase-admin';

const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;

if (!admin.apps.length) {
  if (!serviceAccountJsonString) {
    console.error(
      '[Firebase Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'The Admin SDK requires this to be the JSON content of your service account key to initialize in environments like Vercel Edge or Next.js Middleware.'
    );
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountJsonString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using FIREBASE_SERVICE_ACCOUNT_JSON.');
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      const currentProjectId = admin.instanceId()?.app?.options?.projectId || serviceAccount.project_id;
      if (currentProjectId) {
          console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
      } else {
          console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID.');
      }
    } catch (error: any) {
      console.error('[Firebase Admin Init] Firebase Admin App initialization error from JSON string:', error.message);
      if (error.message.includes('Invalid service account') || error.message.includes('Failed to parse private key') || error.message.includes('Error parsing service account key')) {
          console.error('[Firebase Admin Init] Detail: The JSON string in FIREBASE_SERVICE_ACCOUNT_JSON might be malformed or not a valid service account key.');
      }
    }
  }
} else {
  // App already initialized, get existing instances
  adminDb = admin.firestore(); // Ensure these are assigned if app already exists
  adminAuth = admin.auth();
  console.log('[Firebase Admin Init] Using existing Firebase Admin App.');
}

// Fallback initialization for adminDb if it's still undefined (e.g. if FIREBASE_SERVICE_ACCOUNT_JSON was missing during initial load but set later)
// This is more of a safeguard for hot-reloading scenarios; ideally, env vars are set on startup.
if (!adminDb && admin.apps.length > 0) {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
}


export { adminDb, adminAuth, admin };
