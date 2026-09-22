import { adminAuth } from "../firebaseAdmin.js";

// Confirms the caller is a real, signed-in Firebase user. Which records
// they're allowed to touch is enforced the same way every other privileged
// action in this app already is, at the UI layer, not with a server-side
// permissions model - see user-admin-server/README.md for the same caveat
// spelled out in more detail.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing Authorization: Bearer <idToken> header" });

  try {
    req.caller = await adminAuth.verifyIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired sign-in token: " + err.message });
  }
}
