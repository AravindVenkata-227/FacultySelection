
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  console.log('[Firebase Admin Init] Attempting to initialize Firebase Admin SDK...');
  try {
    if (gacPath) {
      console.log(`[Firebase Admin Init] Attempting initialization using GOOGLE_APPLICATION_CREDENTIALS: ${gacPath}`);
      // The SDK will automatically use this environment variable if set and valid.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.');
    } else {
      console.error('[Firebase Admin Init] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is NOT SET. Cannot initialize Firebase Admin SDK.');
      // No fallback to FIREBASE_SERVICE_ACCOUNT_JSON to keep it simple and rely on standard method.
      throw new Error('Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS) not found in environment variables.');
    }

    adminDb = admin.firestore();
    adminAuth = admin.auth();
    FieldValue = admin.firestore.FieldValue;
    const currentProjectId = admin.instanceId()?.app?.options?.projectId;
    if (currentProjectId) {
      console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else {
      console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID after initialization.');
    }

  } catch (initError: any) {
    console.error('[Firebase Admin Init] Firebase Admin App initialization error:', initError.message, initError.stack ? initError.stack : '');
    if (initError.code === 'app/duplicate-app') {
        console.warn('[Firebase Admin Init] Firebase Admin App already initialized. Using existing instance.');
        // Ensure services are assigned from the existing app if possible
        if (admin.apps[0]) {
            if (!adminDb) adminDb = admin.apps[0].firestore();
            if (!adminAuth) adminAuth = admin.apps[0].auth();
            if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue;
        } else {
            console.error('[Firebase Admin Init] Duplicate app error but no existing app instance found to reassign services from.');
        }
    } else if (initError.message && (initError.message.includes('Failed to parse service account') || initError.message.includes('Error parsing service account key'))) {
      console.error('[Firebase Admin Init] Detail: The service account key file specified by GOOGLE_APPLICATION_CREDENTIALS might be corrupted, not valid JSON, or inaccessible.');
    } else if (initError.message && initError.message.includes("Cannot read properties of undefined (reading 'INTERNAL')")) {
      console.error("[Firebase Admin Init] Detail: The 'INTERNAL' error often points to an issue with the SDK's core components or environment setup. Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid, unaltered service account JSON file in the project root and that there are no conflicts with firebase-admin package versions or dependencies.");
    }
  }
} else {
  console.log('[Firebase Admin Init] Firebase Admin App already initialized. Using existing instance.');
  // Ensure services are assigned if they weren't during the initial block
  if (admin.apps[0]) {
    if (!adminDb) adminDb = admin.apps[0].firestore();
    if (!adminAuth) adminAuth = admin.apps[0].auth();
    if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue; // Check if admin.firestore is available
  }
}

// Final check to ensure services are available if an app exists
if (admin.apps.length > 0 && admin.apps[0] && (!adminDb || !adminAuth || !FieldValue)) {
    console.warn('[Firebase Admin Init] Re-checking service assignments: Admin app exists but some services might not have been fully assigned.');
    if(!adminDb && admin.apps[0]?.firestore) {
        adminDb = admin.apps[0].firestore();
        console.log('[Firebase Admin Init] Re-assigned adminDb from existing app.');
    }
    if(!adminAuth && admin.apps[0]?.auth) {
        adminAuth = admin.apps[0].auth();
        console.log('[Firebase Admin Init] Re-assigned adminAuth from existing app.');
    }
    if (!FieldValue && admin.firestore) {
        FieldValue = admin.firestore.FieldValue;
        console.log('[Firebase Admin Init] Re-assigned FieldValue.');
    }
}


export { adminDb, adminAuth, admin, FieldValue };
    