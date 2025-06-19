
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

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase Init] Firebase App initialized. Project ID from local firebaseConfig:', firebaseConfig.projectId);
  if (app.options && app.options.projectId) {
    console.log('[Firebase Init] Firebase App initialized. Project ID from active SDK options:', app.options.projectId);
  } else {
    console.log('[Firebase Init] Firebase App initialized, but could not retrieve projectId from active SDK options.');
  }
} else {
  app = getApp();
  console.log('[Firebase Init] Existing Firebase App retrieved. Project ID from local firebaseConfig:', firebaseConfig.projectId);
  if (app.options && app.options.projectId) {
    console.log('[Firebase Init] Existing Firebase App retrieved. Project ID from active SDK options:', app.options.projectId);
  } else {
    console.log('[Firebase Init] Existing Firebase App retrieved, but could not retrieve projectId from active SDK options.');
  }
}

db = getFirestore(app);

export { app, db };
