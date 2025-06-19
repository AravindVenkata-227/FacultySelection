
import * as admin from 'firebase-admin';

// Try to get the service account JSON from an environment variable
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (!serviceAccountJsonString) {
    console.error(
      '[Firebase Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'This is required for the Firebase Admin SDK to authenticate. ' +
      'Please set this variable to the JSON content of your service account key.'
    );
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountJsonString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount), // Pass the parsed object
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using FIREBASE_SERVICE_ACCOUNT_JSON.');

      const currentProjectId = admin.instanceId()?.app?.options?.projectId || serviceAccount.project_id;
      if (currentProjectId) {
          console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
      } else {
          console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID.');
      }

    } catch (error: any) {
      console.error('[Firebase Admin Init] Firebase Admin App initialization error:', error.message);
      if (error.message.includes('Invalid service account') || error.message.includes('Failed to parse private key') || error.message.includes('Error parsing service account key')) {
          console.error('[Firebase Admin Init] Detail: The JSON string in FIREBASE_SERVICE_ACCOUNT_JSON might be malformed, not a valid service account key, or the private_key is not correctly formatted (e.g., newline characters).');
      }
    }
  }
}

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;

if (admin.apps.length > 0) {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
} else {
  console.warn('[Firebase Admin Init] Firebase Admin SDK not initialized. Firestore and Auth services will not be available via admin context.');
}

export { adminDb, adminAuth, admin };
