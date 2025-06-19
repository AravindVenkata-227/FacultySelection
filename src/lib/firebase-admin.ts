
import * as admin from 'firebase-admin';

// Ensure that GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// to the absolute path of your service account key file.
// Example: /path/to/your/serviceAccountKey.json

const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // The Admin SDK will automatically attempt to find credentials via
      // GOOGLE_APPLICATION_CREDENTIALS env var or default locations.
      // If projectId is in your service account key, it's often picked up automatically.
      // Explicitly setting projectId can be a good practice if there's ambiguity.
      // projectId: projectIdFromEnv, // Uncomment if you have this env var set and want to be explicit
    });
    console.log('[Firebase Admin Init] Firebase Admin App initialized.');
    
    // Log the project ID the Admin SDK is actually using
    // Note: admin.app().options.projectId might not be directly available in older versions or certain contexts
    // A more reliable way if above is problematic:
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
    // Provide more details if it's a credential issue
    if (error.message.includes('Credential implementation provided to initializeApp()')) {
        console.error('[Firebase Admin Init] Detail: This often means GOOGLE_APPLICATION_CREDENTIALS is not set correctly or the file is unreadable/invalid.');
    }
    // Log the stack for more detailed debugging if needed
    // console.error(error.stack); 
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth(); // Available if you need admin auth operations

export { adminDb, adminAuth, admin };
