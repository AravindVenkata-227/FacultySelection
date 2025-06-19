
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
    console.log('[Firebase Admin Init] First 100 chars of JSON string:', serviceAccountJsonString.substring(0, 100));
    console.log('[Firebase Admin Init] Last 100 chars of JSON string:', serviceAccountJsonString.substring(serviceAccountJsonString.length - 100));
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJsonString);
      console.log('[Firebase Admin Init] Successfully parsed FIREBASE_SERVICE_ACCOUNT_JSON string.');
      if (!serviceAccount || !serviceAccount.project_id) {
        console.error('[Firebase Admin Init] ERROR: Parsed service account JSON is invalid or missing project_id.');
      } else {
        console.log(`[Firebase Admin Init] Project ID from parsed JSON: ${serviceAccount.project_id}`);
      }
    } catch (parseError: any) {
      console.error('[Firebase Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON string:', parseError.message);
      console.error('[Firebase Admin Init] Ensure newlines in private_key are correctly escaped (e.g., \\n) if the JSON string is on a single line in your .env file.');
      serviceAccount = null; // Ensure serviceAccount is null if parsing fails
    }

    if (serviceAccount) {
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
        console.error('[Firebase Admin Init] Firebase Admin App initialization error from parsed JSON:', initError.message, initError.stack);
        if (initError.message && (initError.message.includes('Invalid service account') || initError.message.includes('Failed to parse private key') || initError.message.includes('Error parsing service account key'))) {
            console.error('[Firebase Admin Init] Detail: The parsed service account key is invalid. Ensure private_key newlines are correctly escaped (e.g. \\n) if the JSON is on a single line in .env.');
        }
        adminDb = undefined;
        adminAuth = undefined;
        FieldValue = undefined;
      }
    } else {
        // This block executes if serviceAccountJsonString was present but JSON.parse failed
        console.error("[Firebase Admin Init] Firebase Admin App NOT initialized due to JSON parsing failure.");
    }
  }
} else {
  console.log('[Firebase Admin Init] Using existing Firebase Admin App.');
  if (!adminDb) adminDb = admin.firestore(); // Should already be set if app exists
  if (!adminAuth) adminAuth = admin.auth(); // Should already be set
  if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue; // Should already be set
}

// Additional check to ensure instances are available if an app exists but they weren't set
if (admin.apps.length > 0 && (!adminDb || !adminAuth || !FieldValue) ) {
    console.warn('[Firebase Admin Init] Admin app exists but adminDb, adminAuth, or FieldValue was not fully initialized during this module load. Re-attempting to get instances.');
    if(!adminDb && admin.apps[0]) adminDb = admin.apps[0].firestore(); // Try getting from default app
    if(!adminAuth && admin.apps[0]) adminAuth = admin.apps[0].auth();
    if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue;
}

export { adminDb, adminAuth, admin, FieldValue };
