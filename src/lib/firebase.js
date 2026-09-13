// Firebase is used for authentication only - all app data lives in a real
// MySQL database via app-data-server (see src/lib/localDb.js, its client).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "njiru-carwash.firebaseapp.com",
  projectId: "njiru-carwash",
  storageBucket: "njiru-carwash.firebasestorage.app",
  messagingSenderId: "112675754201",
  appId: "1:112675754201:web:55eb9b48ed58432d912ec8",
  measurementId: "G-2P8489N3N7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
