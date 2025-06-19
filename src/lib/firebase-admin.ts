
import * as admin from 'firebase-admin';

// Ensure that GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// to the absolute path of your service account key file.
// Example: /path/to/your/serviceAccountKey.json

const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      throw new Error('CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Cannot initialize Firebase Admin SDK.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      // Optionally, you can specify the databaseURL if needed, but usually not required for Firestore.
      // databaseURL: `https://${projectIdFromEnv}.firebaseio.com` 
    });
    console.log('[Firebase Admin Init] Firebase Admin App initialized using GOOGLE_APPLICATION_CREDENTIALS.');
    
    const currentProjectId = admin.instanceId().app.options.projectId;
    if (currentProjectId) {
        console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else if (projectIdFromEnv) {
        console.log('[Firebase Admin Init] Admin SDK initialized. Intended project ID from env (if used):', projectIdFromEnv);
        console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID directly from options; relying on service account or env var.');
    } else {
        console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID. Ensure service account is correctly configured or projectId is set.');
    }

  } catch (error: any) {
    console.error('[Firebase Admin Init] Firebase Admin App initialization error:', error.message);
    if (error.message.includes('Credential implementation provided to initializeApp()')) {
        console.error('[Firebase Admin Init] Detail: This often means GOOGLE_APPLICATION_CREDENTIALS is not set correctly or the file is unreadable/invalid.');
    } else if (error.message.includes('ENOENT')) {
        console.error(`[Firebase Admin Init] Detail: The service account key file specified by GOOGLE_APPLICATION_CREDENTIALS was not found at path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth(); // Available if you need admin auth operations

export { adminDb, adminAuth, admin };
