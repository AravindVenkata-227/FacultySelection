
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// IMPORTANT:
// Replace these placeholder values with your actual Firebase project's configuration.
// You can find this configuration in the Firebase console:
// Project settings > General > Your apps > Web app > SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfapu5biuvKY1PT90ZoOaLn_YLv4owpeQ",
  authDomain: "faculty-connect-owcc7.firebaseapp.com",
  projectId: "faculty-connect-owcc7", // This should be your FIREBASE project ID
  storageBucket: "faculty-connect-owcc7.firebasestorage.app",
  messagingSenderId: "336783424106",
  appId: "1:336783424106:web:0f45c49122c1246075a813"
};


let app: FirebaseApp;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase Client Init] Firebase App initialized. Project ID from local firebaseConfig:', firebaseConfig.projectId);
} else if (typeof window !== 'undefined') {
  app = getApp();
  console.log('[Firebase Client Init] Existing Firebase App retrieved. Project ID from local firebaseConfig:', firebaseConfig.projectId);
} else {
  // Avoid initializing client SDK in server/edge environments if not already done by Admin SDK
  // or if this file is accidentally imported server-side for client SDK.
  // The Admin SDK should be the primary way to interact with Firebase on the server.
  console.log('[Firebase Client Init] Skipped client app initialization (server environment or already initialized).');
}

// Only initialize db if app was initialized (client-side)
// @ts-ignore app might not be initialized if on server
if (app) {
  db = getFirestore(app);
}

export { app, db };
