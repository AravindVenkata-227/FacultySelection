
import * as admin from 'firebase-admin';

const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;

if (!admin.apps.length) {
  if (!serviceAccountJsonString) {
    console.error(
      '[Firebase Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'The Admin SDK requires this to be the JSON content of your service account key.'
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
      console.error('[Firebase Admin Init] Firebase Admin App initialization error from JSON string:', error.message, error.stack);
      if (error.message.includes('Invalid service account') || error.message.includes('Failed to parse private key') || error.message.includes('Error parsing service account key')) {
          console.error('[Firebase Admin Init] Detail: The JSON string in FIREBASE_SERVICE_ACCOUNT_JSON might be malformed or not a valid service account key.');
      }
       // Set adminDb and adminAuth to undefined explicitly on failure to prevent partial initialization states.
      adminDb = undefined;
      adminAuth = undefined;
    }
  }
} else {
  // App already initialized, get existing instances
  console.log('[Firebase Admin Init] Using existing Firebase Admin App.');
  if (!adminDb) adminDb = admin.firestore(); // Ensure these are assigned if app already exists and not yet assigned
  if (!adminAuth) adminAuth = admin.auth();
}

// Fallback/check for adminDb after initialization attempt
if (admin.apps.length > 0 && !adminDb) {
  console.warn('[Firebase Admin Init] Admin app exists but adminDb was not initialized. Attempting to get Firestore instance.');
  adminDb = admin.firestore();
}
if (admin.apps.length > 0 && !adminAuth) {
  console.warn('[Firebase Admin Init] Admin app exists but adminAuth was not initialized. Attempting to get Auth instance.');
  adminAuth = admin.auth();
}


export { adminDb, adminAuth, admin };
