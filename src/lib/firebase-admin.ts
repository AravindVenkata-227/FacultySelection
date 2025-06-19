
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let FieldValue: typeof admin.firestore.FieldValue | undefined;

const GAC_ENV_VAR = 'GOOGLE_APPLICATION_CREDENTIALS';

if (!admin.apps.length) {
  console.log('[Firebase Admin Init] Attempting to initialize Firebase Admin SDK...');
  try {
    const gacPathFromEnv = process.env[GAC_ENV_VAR];
    if (gacPathFromEnv) {
      const absoluteGacPath = path.isAbsolute(gacPathFromEnv) ? gacPathFromEnv : path.resolve(process.cwd(), gacPathFromEnv);
      console.log(`[Firebase Admin Init] Using GOOGLE_APPLICATION_CREDENTIALS, resolved path: ${absoluteGacPath}`);

      if (!fs.existsSync(absoluteGacPath)) {
        console.error(`[Firebase Admin Init] CRITICAL: Service account file NOT FOUND at specified GOOGLE_APPLICATION_CREDENTIALS path: ${absoluteGacPath}`);
        throw new Error(`Service account file not found at ${absoluteGacPath}. Check ${GAC_ENV_VAR} in your .env file.`);
      }
      
      // The GOOGLE_APPLICATION_CREDENTIALS env variable should be set for applicationDefault() to work
      // We don't need to explicitly read the file content here if using applicationDefault()
      // We only read it to extract projectId for explicit initialization if needed or for logging.
      const serviceAccountString = fs.readFileSync(absoluteGacPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountString);

      if (!serviceAccount.project_id) {
        console.error(`[Firebase Admin Init] CRITICAL: project_id not found in the service account JSON file: ${absoluteGacPath}`);
        throw new Error('project_id missing from service account JSON.');
      }
      console.log(`[Firebase Admin Init] Extracted projectId: ${serviceAccount.project_id} from ${absoluteGacPath}`);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount), // Explicitly use the parsed service account
        projectId: serviceAccount.project_id,
      });
      console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using explicitly parsed service account and projectId from GOOGLE_APPLICATION_CREDENTIALS file.');

    } else {
      console.warn(`[Firebase Admin Init] ${GAC_ENV_VAR} environment variable is NOT SET. Attempting default initialization which might only work in certain GCP environments.`);
      admin.initializeApp(); // Try with implicit credentials if GAC_ENV_VAR is not set
      console.log('[Firebase Admin Init] Firebase Admin App initialized using implicit default credentials (e.g., for GCP environments).');
    }

    adminDb = admin.firestore();
    adminAuth = admin.auth();
    FieldValue = admin.firestore.FieldValue;
    const currentProjectId = admin.apps[0]?.options?.projectId;
    if (currentProjectId) {
      console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else {
      console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID after initialization, but projectId might have been explicitly set.');
    }
  } catch (error: any) {
    console.error(`[Firebase Admin Init] Firebase Admin App initialization FAILED: ${error.message}`, error.stack ? error.stack : '');
    console.error("[Firebase Admin Init] Detail: The 'INTERNAL' error often points to an issue with the SDK's core components or environment setup. Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid, unaltered service account JSON file (try re-downloading it) in the project root and that there are no conflicts with firebase-admin package versions or dependencies.");
    // adminDb, adminAuth, FieldValue will remain undefined
  }
} else {
  console.log('[Firebase Admin Init] Firebase Admin App already initialized. Using existing instance.');
  if (admin.apps.length > 0 && admin.apps[0]) {
    if (!adminDb) adminDb = admin.apps[0].firestore();
    if (!adminAuth) adminAuth = admin.apps[0].auth();
    if (!FieldValue && admin.firestore) FieldValue = admin.firestore.FieldValue; // Ensure FieldValue is assigned
  }
}

export { adminDb, adminAuth, admin, FieldValue };
