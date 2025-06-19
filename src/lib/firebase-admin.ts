
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

if (!admin.apps.length) {
  console.log('[Firebase Admin Init] Attempting to initialize Firebase Admin SDK...');
  try {
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (gacPath) {
      // Ensure the path is resolved correctly, especially if it's relative
      const absoluteGacPath = path.isAbsolute(gacPath) ? gacPath : path.resolve(process.cwd(), gacPath);
      console.log(`[Firebase Admin Init] Using GOOGLE_APPLICATION_CREDENTIALS, resolved path: ${absoluteGacPath}`);

      if (!fs.existsSync(absoluteGacPath)) {
        console.error(`[Firebase Admin Init] CRITICAL: Service account file NOT FOUND at: ${absoluteGacPath}`);
        throw new Error(`Service account file not found at ${absoluteGacPath}. Check GOOGLE_APPLICATION_CREDENTIALS.`);
      }

      const serviceAccountString = fs.readFileSync(absoluteGacPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountString);

      if (!serviceAccount.project_id) {
        console.error('[Firebase Admin Init] CRITICAL: project_id not found in the service account JSON file.');
        throw new Error('project_id missing from service account JSON.');
      }
      console.log(`[Firebase Admin Init] Extracted projectId: ${serviceAccount.project_id} from ${absoluteGacPath}`);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount), // Use the parsed service account object directly
        projectId: serviceAccount.project_id,
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using parsed service account and explicit projectId.');

    } else {
      console.error('[Firebase Admin Init] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is NOT SET. Cannot initialize Firebase Admin SDK.');
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    }

    adminDb = admin.firestore();
    adminAuth = admin.auth();
    FieldValue = admin.firestore.FieldValue;
    const currentProjectId = admin.apps[0]?.options?.projectId;
    if (currentProjectId) {
      console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else {
      console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID after initialization, but projectId was explicitly set.');
    }
  } catch (error: any) {
    console.error(`[Firebase Admin Init] Firebase Admin App initialization FAILED: ${error.message}`, error.stack ? error.stack : '');
    console.error("[Firebase Admin Init] Detail: The 'INTERNAL' error often points to an issue with the SDK's core components or environment setup. Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid, unaltered service account JSON file (try re-downloading it) in the project root and that there are no conflicts with firebase-admin package versions or dependencies.");
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
    