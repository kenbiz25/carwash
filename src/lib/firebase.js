// Firebase Auth is the only remaining Firebase dependency — all app data
// (Firestore + Storage previously) now lives in the browser via src/lib/localDb.js
// until a hosting decision is made.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "carwash-managerke.firebaseapp.com",
  projectId: "carwash-managerke",
  storageBucket: "carwash-managerke.firebasestorage.app",
  messagingSenderId: "38414357255",
  appId: "1:38414357255:web:430a67291d770ebcc46ba2",
  measurementId: "G-WXKBQT4Q95"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
