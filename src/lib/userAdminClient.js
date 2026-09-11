// Talks to the standalone user-admin-server backend (see
// user-admin-server/README.md). That server is what actually holds the
// Firebase service account — creating a login, resetting a password, or
// assigning a branch/role are all privileged Admin SDK actions the browser
// can never be trusted to do directly.
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.VITE_USER_ADMIN_API_URL || "http://localhost:4041";
export const SYNTHETIC_EMAIL_DOMAIN = "users.bgoshinehub.internal";
export const SYNTHETIC_PHONE_DOMAIN = "phone.bgoshinehub.internal";

// Kenyan MSISDN normalization so "0757234111", "+254757234111" and
// "254 757 234 111" all resolve to the same account. Must match
// user-admin-server/src/routes/users.js's copy exactly — sign-in computes
// this same synthetic email client-side without ever calling that server.
function normalizePhoneKe(input) {
  let digits = String(input || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.length === 9) digits = "254" + digits;
  return digits;
}

// A bare number (mostly digits, allowing spaces/dashes/a leading +) reads as
// a phone number rather than a username — real usernames created here are
// always at least partly alphabetic, so this shouldn't misfire in practice.
function looksLikePhone(value) {
  return /^\+?[\d\s-]{7,}$/.test(value);
}

// A manager/owner/super admin sets a plain username OR phone number for
// staff; Firebase Auth itself only understands email/password, so either
// one (no "@") is transparently mapped to a fake address under a fixed
// internal domain before every sign-in — nobody sends mail there, it's
// never dereferenced. Real email addresses pass through unchanged.
export function toLoginIdentifier(emailOrUsernameOrPhone) {
  const value = (emailOrUsernameOrPhone || "").trim();
  if (value.includes("@")) return value;
  if (looksLikePhone(value)) return `${normalizePhoneKe(value)}@${SYNTHETIC_PHONE_DOMAIN}`;
  return `${value.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

async function requestJson(path, options = {}) {
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    // A thrown fetch (not a non-2xx response) means the server never
    // answered at all — say so plainly instead of surfacing "Failed to
    // fetch", which tells a manager nothing about what to do next.
    throw new Error(
      `Couldn't reach the login server at ${BASE_URL} - make sure user-admin-server is running, then try again.`
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `user-admin-server request failed (${res.status})`);
  return data;
}

/** Creates a staff login (username OR phone + password), tagged with role/branch right away. */
export function createTeamUser({ username, phone, password, full_name, role, business_id }) {
  return requestJson("/api/users", {
    method: "POST",
    body: JSON.stringify({ username, phone, password, full_name, role, business_id }),
  });
}

/** Lists everyone assigned to one branch (uid, username/email, role). */
export function listBusinessUsers(businessId) {
  return requestJson(`/api/users?business_id=${encodeURIComponent(businessId)}`);
}

/** Accounts (usually first-time Google sign-ins) with no role/branch yet. */
export function listPendingUsers() {
  return requestJson("/api/users/pending");
}

/** A manager/owner/super admin sets someone's password directly. */
export function resetTeamUserPassword(uid, password) {
  return requestJson(`/api/users/${uid}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/** A super admin assigns branch + role to a pending account. */
export function assignPendingUser(uid, { business_id, role }) {
  return requestJson(`/api/users/${uid}/assign`, {
    method: "POST",
    body: JSON.stringify({ business_id, role }),
  });
}
