// One-off: creates (or reuses) a Firebase Auth account and grants it the
// platform-wide "super admin" role via a custom claim - the same mechanism
// user-admin-server uses to grant staff their role/branch, just without a
// business_id since a super admin isn't scoped to one branch.
//
// Usage: set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, FIREBASE_SERVICE_ACCOUNT_JSON
// and VITE_FIREBASE_API_KEY as environment variables, then run:
//   node scripts/create-super-admin.mjs
// Get a service account from Firebase Console -> Project settings ->
// Service accounts -> Generate new private key - reuse the same one you set
// up for user-admin-server/.env if you already have it.
import { initializeApp as initClientApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { initializeApp as initAdminApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

const EMAIL = process.env.SUPER_ADMIN_EMAIL;
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Set ${name} in your environment before running this script.`);
    process.exit(1);
  }
}
requireEnv("SUPER_ADMIN_EMAIL", EMAIL);
requireEnv("SUPER_ADMIN_PASSWORD", PASSWORD);
requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT_JSON);
requireEnv("VITE_FIREBASE_API_KEY (from the repo root .env)", API_KEY);

// Step 1 - create (or sign in to, if it already exists) the account. No
// admin privileges needed for this part; it's the same thing the app's own
// Sign Up form does.
const clientApp = initClientApp({
  apiKey: API_KEY,
  authDomain: "njiru-carwash.firebaseapp.com",
  projectId: "njiru-carwash",
});
const clientAuth = getAuth(clientApp);

let uid;
try {
  const cred = await createUserWithEmailAndPassword(clientAuth, EMAIL, PASSWORD);
  uid = cred.user.uid;
  console.log(`Created a new account for ${EMAIL} (${uid}).`);
} catch (err) {
  if (err.code === "auth/email-already-in-use") {
    const cred = await signInWithEmailAndPassword(clientAuth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log(`Account for ${EMAIL} already existed (${uid}) - confirmed the password matches.`);
  } else {
    throw err;
  }
}

// Step 2 - grant the super admin role. This DOES need admin privileges,
// since only the Admin SDK can set custom claims on an account.
const adminApp = initAdminApp({ credential: cert(JSON.parse(SERVICE_ACCOUNT_JSON)) });
await getAdminAuth(adminApp).setCustomUserClaims(uid, { role: "admin" });

console.log(`${EMAIL} is now a super admin.`);
console.log("Sign out and back in for it to take effect (custom claims only apply on a fresh sign-in token).");
process.exit(0);
