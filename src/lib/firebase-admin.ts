
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  console.log('[Firebase Admin Init] Attempting to initialize Firebase Admin SDK...');
  try {
    console.log('[Firebase Admin Init] Attempting initialization with implicit default credentials (no arguments to initializeApp).');
    admin.initializeApp();
    console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using implicit default credentials.');
  } catch (implicitError: any) {
    console.warn(`[Firebase Admin Init] Implicit default credential initialization FAILED: ${implicitError.message}. Falling back...`);
    if (gacPath) {
      console.log(`[Firebase Admin Init] Attempting initialization using GOOGLE_APPLICATION_CREDENTIALS: ${gacPath}`);
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.');
      } catch (gacError: any) {
        console.error(`[Firebase Admin Init] Firebase Admin App initialization error using GOOGLE_APPLICATION_CREDENTIALS: ${gacError.message}`, gacError.stack ? gacError.stack : '');
        if (gacError.message && gacError.message.includes('INTERNAL')) {
            console.error("[Firebase Admin Init] Detail: The 'INTERNAL' error often points to an issue with the SDK's core components or environment setup. Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid, unaltered service account JSON file (try re-downloading it) in the project root and that there are no conflicts with firebase-admin package versions or dependencies.");
        } else if (gacError.message && (gacError.message.includes('Failed to parse service account') || gacError.message.includes('Error parsing service account key'))) {
            console.error('[Firebase Admin Init] Detail: The service account key file specified by GOOGLE_APPLICATION_CREDENTIALS might be corrupted, not valid JSON, inaccessible. Please try re-downloading the key file from Firebase console and ensure the path is correct relative to project root.');
        }
      }
    } else {
      console.error('[Firebase Admin Init] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is NOT SET, and implicit initialization failed. Cannot initialize Firebase Admin SDK.');
    }
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    adminDb = admin.apps[0].firestore();
    adminAuth = admin.apps[0].auth();
    FieldValue = admin.firestore.FieldValue;
    const currentProjectId = admin.apps[0].options?.projectId || admin.instanceId()?.app?.options?.projectId;
    if (currentProjectId) {
      console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else {
      console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID after initialization.');
    }
  } else {
    console.error('[Firebase Admin Init] Firebase Admin SDK initialization failed. No app instance found.');
  }

} else {
  console.log('[Firebase Admin Init] Firebase Admin App already initialized. Using existing instance.');
  if (admin.apps.length > 0 && admin.apps[0]) {
    if (!adminDb) adminDb = admin.apps[0].firestore();
    if (!adminAuth) adminAuth = admin.apps[0].auth();
    if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue;
  }
}

export { adminDb, adminAuth, admin, FieldValue };
