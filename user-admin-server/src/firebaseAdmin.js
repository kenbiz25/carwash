import admin from "firebase-admin";
import { config, hasServiceAccount } from "./config.js";

function parseServiceAccount() {
  try {
    return JSON.parse(config.serviceAccountJson);
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
  : admin.initializeApp({ projectId: config.projectId });

export const adminAuth = admin.auth(app);
