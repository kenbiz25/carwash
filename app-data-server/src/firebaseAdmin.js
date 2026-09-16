import admin from "firebase-admin";
import { config } from "./config.js";

// Verification-only - no service account needed, just the public project id
// (Admin SDK fetches Google's public certs by project id). This only ever
// confirms the caller is a real signed-in Firebase user; it does not need to
// create or edit accounts the way user-admin-server does.
const app = admin.initializeApp({ projectId: config.projectId });
export const adminAuth = admin.auth(app);
