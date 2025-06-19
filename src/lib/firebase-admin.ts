
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  console.log('[Firebase Admin Init] Attempting to initialize Firebase Admin SDK...');
  try {
    if (gacPath) {
      console.log(`[Firebase Admin Init] Attempting initialization using GOOGLE_APPLICATION_CREDENTIALS: ${gacPath}`);
      // The SDK will automatically use this environment variable if set and valid.
      // The credential object is implicitly created from the file path.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.');
    } else if (serviceAccountJsonString) {
      console.log('[Firebase Admin Init] GOOGLE_APPLICATION_CREDENTIALS not set. Attempting initialization using FIREBASE_SERVICE_ACCOUNT_JSON.');
      console.log('[Firebase Admin Init] Length of JSON string (approx):', serviceAccountJsonString.length);

      let serviceAccount: admin.ServiceAccount | null = null;
      try {
        serviceAccount = JSON.parse(serviceAccountJsonString);
        console.log('[Firebase Admin Init] Successfully parsed FIREBASE_SERVICE_ACCOUNT_JSON string.');
      } catch (parseError: any) {
        console.error('[Firebase Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON string:', parseError.message);
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
      }

      if (!serviceAccount || typeof serviceAccount !== 'object') {
        console.error('[Firebase Admin Init] Parsed service account from JSON string is not a valid object.');
        throw new Error('Parsed service account from JSON string is not a valid object.');
      }
      if (!serviceAccount.project_id) {
        console.error('[Firebase Admin Init] ERROR: Parsed service account JSON is missing project_id.');
        throw new Error('Parsed service account JSON is missing project_id.');
      }
      console.log(`[Firebase Admin Init] Project ID from parsed JSON: ${serviceAccount.project_id}`);

      if (!serviceAccount.private_key || typeof serviceAccount.private_key !== 'string') {
        console.error('[Firebase Admin Init] ERROR: private_key is missing or not a string in the parsed service account JSON.');
        throw new Error('private_key is missing or not a string in the parsed service account JSON.');
      }
      
      console.log('[Firebase Admin Init] !!! SECURITY WARNING !!! Full private_key being passed to SDK (REMOVE THIS LOG AFTER DEBUGGING):\n', serviceAccount.private_key);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using parsed JSON string.');
    } else {
      console.error('[Firebase Admin Init] CRITICAL: Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_JSON environment variables are set. Cannot initialize Firebase Admin SDK.');
      throw new Error('Firebase Admin SDK credentials not found in environment variables.');
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
    console.error('[Firebase Admin Init] Firebase Admin App initialization error:', initError.message);
    if (initError.code === 'app/duplicate-app') {
        console.warn('[Firebase Admin Init] Firebase Admin App already initialized. Using existing instance.');
        if (admin.apps[0]) {
            adminDb = admin.apps[0].firestore();
            adminAuth = admin.apps[0].auth();
            if (admin.firestore && !FieldValue) FieldValue = admin.firestore.FieldValue;
        } else {
            console.error('[Firebase Admin Init] Duplicate app error but no existing app instance found.');
        }
    } else if (initError.message && (initError.message.includes('Invalid service account') || initError.message.includes('Failed to parse private key') || initError.message.includes('Error parsing service account key'))) {
      console.error('[Firebase Admin Init] Detail: The service account key (from file or JSON string) is invalid. Ensure the key is not corrupted and newlines are correctly handled if using JSON string.');
    }
  }
} else {
  console.log('[Firebase Admin Init] Using existing Firebase Admin App.');
  if (admin.apps[0]) {
    if (!adminDb) adminDb = admin.apps[0].firestore();
    if (!adminAuth) adminAuth = admin.apps[0].auth();
    if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue;
  }
}

if (admin.apps.length > 0 && admin.apps[0] && (!adminDb || !adminAuth || !FieldValue)) {
    console.warn('[Firebase Admin Init] Re-checking instances after initial block: Admin app exists but services might not have been fully assigned.');
    if(!adminDb && admin.apps[0]?.firestore) {
        adminDb = admin.apps[0].firestore();
        console.log('[Firebase Admin Init] Re-assigned adminDb.');
    }
    if(!adminAuth && admin.apps[0]?.auth) {
        adminAuth = admin.apps[0].auth();
        console.log('[Firebase Admin Init] Re-assigned adminAuth.');
    }
    if (!FieldValue && admin.firestore) {
        FieldValue = admin.firestore.FieldValue;
        console.log('[Firebase Admin Init] Re-assigned FieldValue.');
    }
}

export { adminDb, adminAuth, admin, FieldValue };
