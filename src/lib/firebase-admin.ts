
import * as admin from 'firebase-admin';

const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

if (!admin.apps.length) {
  if (!serviceAccountJsonString) {
    console.error(
      '[Firebase Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.'
    );
  } else {
    console.log('[Firebase Admin Init] FIREBASE_SERVICE_ACCOUNT_JSON environment variable IS SET.');
    console.log('[Firebase Admin Init] Length of JSON string (approx):', serviceAccountJsonString.length);
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJsonString);
      console.log('[Firebase Admin Init] Successfully parsed FIREBASE_SERVICE_ACCOUNT_JSON string.');
      if (!serviceAccount || !serviceAccount.project_id) {
        console.error('[Firebase Admin Init] ERROR: Parsed service account JSON is invalid or missing project_id.');
        console.log('[Firebase Admin Init] Parsed service account (first 200 chars):', JSON.stringify(serviceAccount)?.substring(0,200));
      } else {
        console.log(`[Firebase Admin Init] Project ID from parsed JSON: ${serviceAccount.project_id}`);
      }
    } catch (parseError: any) {
      console.error('[Firebase Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON string:', parseError.message);
      console.error('[Firebase Admin Init] Ensure newlines in private_key are correctly escaped (e.g., \\\\n) if the JSON string is on a single line in your .env file.');
      console.error('[Firebase Admin Init] Received string (first 200 chars):', serviceAccountJsonString.substring(0, 200));
      console.error('[Firebase Admin Init] Received string (last 200 chars):', serviceAccountJsonString.substring(Math.max(0, serviceAccountJsonString.length - 200)));
      serviceAccount = null; // Ensure serviceAccount is null if parsing fails
    }

    if (serviceAccount && serviceAccount.project_id) { // Check for project_id as a proxy for successful parse
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using parsed JSON.');
        adminDb = admin.firestore();
        adminAuth = admin.auth();
        FieldValue = admin.firestore.FieldValue;

        const currentProjectId = admin.instanceId()?.app?.options?.projectId || serviceAccount.project_id;
        if (currentProjectId) {
            console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
        } else {
            console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID after initialization.');
        }

      } catch (initError: any) {
        console.error('[Firebase Admin Init] Firebase Admin App initialization error from JSON string:', initError.message, initError.stack);
        if (initError.message && (initError.message.includes('Invalid service account') || initError.message.includes('Failed to parse private key') || initError.message.includes('Error parsing service account key'))) {
            console.error('[Firebase Admin Init] Detail: The parsed service account key is invalid. Ensure private_key newlines are correctly escaped (e.g. \\\\n) if the JSON is on a single line in .env.');
        }
        adminDb = undefined;
        adminAuth = undefined;
        FieldValue = undefined;
      }
    } else {
        console.error("[Firebase Admin Init] Firebase Admin App NOT initialized due to missing or invalid service account JSON content after parsing.");
    }
  }
} else {
  console.log('[Firebase Admin Init] Using existing Firebase Admin App.');
  // Ensure instances are correctly assigned if app already exists from a previous import/init
  if (!adminDb && admin.apps[0]) adminDb = admin.apps[0].firestore();
  if (!adminAuth && admin.apps[0]) adminAuth = admin.apps[0].auth();
  if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue;
}

// Final check for instances
if (admin.apps.length > 0 && (!adminDb || !adminAuth || !FieldValue)) {
    console.warn('[Firebase Admin Init] Re-checking instances: Admin app exists but adminDb, adminAuth, or FieldValue might not have been fully initialized. Attempting to re-get.');
    if(!adminDb && admin.apps[0]) {
        adminDb = admin.apps[0].firestore();
        console.log('[Firebase Admin Init] Re-assigned adminDb.');
    }
    if(!adminAuth && admin.apps[0]) {
        adminAuth = admin.apps[0].auth();
        console.log('[Firebase Admin Init] Re-assigned adminAuth.');
    }
    if (!FieldValue && admin.firestore) {
        FieldValue = admin.firestore.FieldValue;
        console.log('[Firebase Admin Init] Re-assigned FieldValue.');
    }
}


export { adminDb, adminAuth, admin, FieldValue };
