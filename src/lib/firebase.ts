
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
// Client-side Firestore is no longer used by server-side data.ts,
// but might still be used by client components if they import db directly.
// For server-side, adminDb from firebase-admin.ts is used.
import { getFirestore, type Firestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyDfapu5biuvKY1PT90ZoOaLn_YLv4owpeQ",
  authDomain: "faculty-connect-owcc7.firebaseapp.com",
  projectId: "faculty-connect-owcc7",
  storageBucket: "faculty-connect-owcc7.firebasestorage.app",
  messagingSenderId: "336783424106",
  appId: "1:336783424106:web:0f45c49122c1246075a813"
};


let app: FirebaseApp;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase Client Init] Firebase App initialized. Project ID from local firebaseConfig:', firebaseConfig.projectId);
  db = getFirestore(app);
} else if (typeof window !== 'undefined') {
  app = getApp();
  console.log('[Firebase Client Init] Existing Firebase App retrieved. Project ID from local firebaseConfig:', firebaseConfig.projectId);
  db = getFirestore(app); // Ensure db is initialized if app already exists
} else {
  // This block is for server-side environments where this file might be imported.
  // However, server-side logic should now primarily use the Admin SDK.
  // console.log('[Firebase Client Init] Skipped client app initialization (server environment or already initialized).');
  // It's safer not to initialize client 'app' or 'db' here to avoid confusion with Admin SDK.
}

export { app, db }; // Exporting client 'db' in case any client components directly use it.
