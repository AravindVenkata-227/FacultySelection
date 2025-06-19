
import * as admin from 'firebase-admin';

const serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountKeyPath) {
  console.error(
    '[Firebase Admin Init] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. ' +
    'This is required for the Firebase Admin SDK to authenticate. ' +
    'Ensure the .env file has this variable set to the ABSOLUTE path of your service account JSON key file.'
  );
} else {
  console.log(`[Firebase Admin Init] GOOGLE_APPLICATION_CREDENTIALS path from env: "${serviceAccountKeyPath}"`);
}


if (!admin.apps.length) {
  try {
    if (!serviceAccountKeyPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKeyPath),
    });
    console.log('[Firebase Admin Init] Firebase Admin App initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.');
    
    const currentProjectId = admin.instanceId()?.app?.options?.projectId;
    if (currentProjectId) {
        console.log('[Firebase Admin Init] Admin SDK is configured for project ID:', currentProjectId);
    } else {
        console.warn('[Firebase Admin Init] Could not automatically determine Admin SDK project ID directly from options. Relies on service account file.');
    }

  } catch (error: any) {
    console.error('[Firebase Admin Init] Firebase Admin App initialization error:', error.message);
    if (error.message.includes('Credential implementation provided to initializeApp()')) {
        console.error('[Firebase Admin Init] Detail: This often means GOOGLE_APPLICATION_CREDENTIALS is not set correctly or the file is unreadable/invalid.');
    } else if (error.code === 'ENOENT' || (typeof error.message === 'string' && error.message.includes('ENOENT'))) {
        console.error(`[Firebase Admin Init] Detail: The service account key file specified by GOOGLE_APPLICATION_CREDENTIALS was not found at path: ${serviceAccountKeyPath}`);
    } else if (error.message.includes('Failed to parse certificate key')) {
        console.error(`[Firebase Admin Init] Detail: The service account key file at ${serviceAccountKeyPath} seems to be malformed or not a valid JSON key file.`);
    }
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, admin };
