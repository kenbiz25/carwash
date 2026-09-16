import { adminAuth } from "./firebaseAdmin.js";

// Confirms the caller is a real, signed-in Firebase user (not who they claim
// to be able to act as - this app's roles are enforced the same way every
// other privileged action already is, at the UI layer, not with a server-side
// permissions model - but this rules out a forged/expired token entirely).
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing Authorization: Bearer <idToken> header" });

  try {
    req.caller = await adminAuth.verifyIdToken(token);
    req.idToken = token; // forwarded to app-data-server to sync business.members on the caller's behalf
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired sign-in token: " + err.message });
  }
}
