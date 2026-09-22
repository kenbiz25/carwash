import admin from "firebase-admin";

// Shared across both src/userAdmin (needs full create/reset/assign access)
// and src/appData (verification-only) - firebase-admin throws "default app
// already exists" if initializeApp() is called more than once in the same
// process, which happens the moment both namespaces get merged into this
// one combined server. This is the single place it's called.
function readServiceAccountJson() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
}

const serviceAccountJson = readServiceAccountJson();
export const hasServiceAccount = Boolean(serviceAccountJson);
const projectId = process.env.FIREBASE_PROJECT_ID || "njiru-carwash";

function parseServiceAccount() {
  try {
    return JSON.parse(serviceAccountJson);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON(_BASE64) is set but isn't valid JSON once decoded - " +
      "if you pasted the raw JSON directly into a hosting control panel's env var field, " +
      "quotes/newlines in the private key may have been stripped; use " +
      "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (base64-encoded) instead. Original error: " + err.message
    );
  }
}

const app = hasServiceAccount
  ? admin.initializeApp({ credential: admin.credential.cert(parseServiceAccount()) })
  // Verification-only: lets verifyIdToken work (fetches Google's public
  // certs by project id, no secret needed) so /health and permission checks
  // still behave, without being able to create/edit users yet.
  : admin.initializeApp({ projectId });

export const adminAuth = admin.auth(app);
