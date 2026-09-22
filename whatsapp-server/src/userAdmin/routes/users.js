import express from "express";
import { adminAuth } from "../../firebaseAdmin.js";
import { requireAuth } from "../authMiddleware.js";
import { hasServiceAccount, config } from "../config.js";

const router = express.Router();
router.use(requireAuth);

const NO_SERVICE_ACCOUNT_ERROR =
  "Admin credentials not configured on this server yet - see user-admin-server/env.example " +
  "(FIREBASE_SERVICE_ACCOUNT_JSON) to enable creating users, resetting passwords, and assigning roles.";

function requireServiceAccount(res) {
  if (!hasServiceAccount) {
    res.status(501).json({ error: NO_SERVICE_ACCOUNT_ERROR });
    return false;
  }
  return true;
}

// Every route below acts on OTHER people's logins (list them all, create
// one, overwrite a password, grant a role) - a valid token alone used to be
// enough to call any of it, so a signed-in cashier could list every login in
// the system or reset a manager's password. These two checks restore the
// same role boundary the UI already presents (only owner/manager/admin ever
// see these actions) at the one layer that actually matters, since a client
// can always be made to send a request the UI wouldn't.
function requireElevatedRole(req, res, next) {
  const role = req.caller?.role;
  if (role !== "admin" && role !== "owner" && role !== "manager") {
    return res.status(403).json({ error: "Only an owner, manager, or super admin can do this." });
  }
  next();
}

// Owners carry full super-admin rights platform-wide too, not just a
// dedicated super admin - so this boundary admits either role.
function requireSuperAdmin(req, res, next) {
  if (req.caller?.role !== "admin" && req.caller?.role !== "owner") {
    return res.status(403).json({ error: "Only a super admin or owner can do this." });
  }
  next();
}

function toSyntheticEmail(username) {
  return `${username.trim().toLowerCase()}@${config.syntheticEmailDomain}`;
}

// Kenyan MSISDN normalization so "0757234111", "+254757234111" and
// "254 757 234 111" all resolve to the same account - this must match
// src/lib/userAdminClient.js's copy exactly, since sign-in computes the same
// synthetic email client-side without calling this server at all.
function normalizePhoneKe(input) {
  let digits = String(input || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.length === 9) digits = "254" + digits;
  return digits;
}

function toSyntheticPhoneEmail(phone) {
  return `${normalizePhoneKe(phone)}@${config.syntheticPhoneDomain}`;
}

// Adds/updates this person on the business's own member list, using the
// caller's own bearer token (already verified by requireAuth) so
// app-data-server sees a normal authenticated write, not a special
// service-to-service path. This is what every page actually reads to
// resolve someone's role on a business (see BusinessManager.jsx,
// Dashboard.jsx) - the custom claim set alongside this makes the business
// show up for them at all across devices, but isn't itself read for role
// display, so both need to stay in sync.
async function syncBusinessMembership(idToken, businessId, email, role) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
  const getRes = await fetch(`${config.appDataApiUrl}/api/data/businesses/${encodeURIComponent(businessId)}`, { headers });
  if (!getRes.ok) throw new Error(`Could not load business ${businessId} from app-data-server (${getRes.status})`);
  const business = await getRes.json();
  if (!business) throw new Error(`Business ${businessId} not found`);

  const emailLower = email.toLowerCase();
  const members = (business.members || []).filter((m) => m.email?.toLowerCase() !== emailLower);
  members.push({ email, role });
  const memberEmails = Array.from(new Set([...(business.member_emails || []), emailLower]));

  const putRes = await fetch(`${config.appDataApiUrl}/api/data/businesses/${encodeURIComponent(businessId)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...business, members, member_emails: memberEmails }),
  });
  if (!putRes.ok) throw new Error(`Could not update business ${businessId} on app-data-server (${putRes.status})`);
}

// The subtractive counterpart to syncBusinessMembership above - removing a
// login should also drop them from the business's own member list, or a
// deleted account leaves behind a "ghost" entry with no login anyone can
// still act on.
async function removeFromBusinessMembership(idToken, businessId, email) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
  const getRes = await fetch(`${config.appDataApiUrl}/api/data/businesses/${encodeURIComponent(businessId)}`, { headers });
  if (!getRes.ok) throw new Error(`Could not load business ${businessId} from app-data-server (${getRes.status})`);
  const business = await getRes.json();
  if (!business) return;

  const emailLower = email.toLowerCase();
  const members = (business.members || []).filter((m) => m.email?.toLowerCase() !== emailLower);
  const memberEmails = (business.member_emails || []).filter((e) => e?.toLowerCase() !== emailLower);

  const putRes = await fetch(`${config.appDataApiUrl}/api/data/businesses/${encodeURIComponent(businessId)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...business, members, member_emails: memberEmails }),
  });
  if (!putRes.ok) throw new Error(`Could not update business ${businessId} on app-data-server (${putRes.status})`);
}

// Every Firebase user record this app cares about, decorated with its
// role/business_id/username custom claims - Admin SDK has no "query by
// custom claim" so we list everyone and filter here. Fine at the scale of a
// handful of branches' staff.
async function listAllUsers() {
  const out = [];
  let pageToken;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const u of page.users) {
      const claims = u.customClaims || {};
      out.push({
        uid: u.uid,
        email: u.email,
        username: claims.username || null,
        phone: claims.phone || null,
        full_name: u.displayName || "",
        role: claims.role || null,
        business_id: claims.business_id || null,
        disabled: u.disabled,
        created_at: u.metadata.creationTime,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return out;
}

// POST /api/users - create a staff login with a username, a phone number,
// OR a real email as the sign-in identifier (exactly one), immediately
// tagged with its role/branch via custom claims so it works on any device,
// and added to the business's own member list so its role actually shows
// up (see syncBusinessMembership above).
router.post("/", requireElevatedRole, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  const { username, phone, email: realEmail, password, full_name, role, business_id } = req.body || {};
  const hasUsername = Boolean(username?.trim());
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(realEmail?.trim());

  if (!password || !role || !business_id || (!hasUsername && !hasPhone && !hasEmail)) {
    return res.status(400).json({ error: "password, role, business_id and a username, phone, or email are required" });
  }
  if ([hasUsername, hasPhone, hasEmail].filter(Boolean).length > 1) {
    return res.status(400).json({ error: "Set only one of username, phone, or email for this login" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedPhone = hasPhone ? normalizePhoneKe(phone) : null;
  if (hasPhone && normalizedPhone.length < 12) {
    return res.status(400).json({ error: "Enter a valid phone number, e.g. 0757234111" });
  }

  const email = hasEmail ? realEmail.trim().toLowerCase() : hasPhone ? toSyntheticPhoneEmail(phone) : toSyntheticEmail(username);
  const identifierLabel = hasEmail ? email : hasPhone ? normalizedPhone : username.trim().toLowerCase();

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: full_name || identifierLabel,
    });
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      business_id,
      ...(hasPhone ? { phone: identifierLabel } : hasUsername ? { username: identifierLabel } : {}),
    });
    await syncBusinessMembership(req.idToken, business_id, email, role);
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      username: hasUsername ? identifierLabel : null,
      phone: hasPhone ? identifierLabel : null,
      role,
      business_id,
    });
  } catch (err) {
    const MAP = {
      "auth/email-already-exists": hasPhone
        ? `Phone number "${identifierLabel}" is already registered to another login`
        : hasEmail
        ? `Email "${identifierLabel}" is already registered to another login`
        : `Username "${identifierLabel}" is already taken`,
    };
    res.status(400).json({ error: MAP[err.code] || err.message });
  }
});

// GET /api/users?business_id=... - list one branch's team (for the Team tab).
router.get("/", requireElevatedRole, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  const { business_id } = req.query;
  // A manager (not a super admin or owner - both carry full platform-wide
  // rights) has no business asking for *everyone* platform-wide - only a
  // missing business_id makes that possible.
  if (!business_id && req.caller?.role !== "admin" && req.caller?.role !== "owner") {
    return res.status(400).json({ error: "business_id is required" });
  }
  const all = await listAllUsers();
  res.json(business_id ? all.filter((u) => u.business_id === business_id) : all);
});

// GET /api/users/pending - accounts (typically first-time Google sign-ins)
// with no role/branch assigned yet, for the Super Admin panel to pick up.
router.get("/pending", requireSuperAdmin, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  const all = await listAllUsers();
  res.json(all.filter((u) => !u.role || !u.business_id));
});

// POST /api/users/:uid/reset-password - set someone's password directly,
// no reset-email round trip, since the requester (their manager/owner/super
// admin) is the one who should hand it to them.
router.post("/:uid/reset-password", requireElevatedRole, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  try {
    await adminAuth.updateUser(req.params.uid, { password });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/users/:uid - permanently remove a login (e.g. an employee who
// has left) - deletes the Firebase Auth account itself and drops them from
// their business's member list, so neither the login nor its access
// lingers behind.
router.delete("/:uid", requireElevatedRole, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  try {
    const existing = await adminAuth.getUser(req.params.uid);
    const businessId = existing.customClaims?.business_id;
    await adminAuth.deleteUser(req.params.uid);
    if (businessId && existing.email) {
      await removeFromBusinessMembership(req.idToken, businessId, existing.email);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/:uid/assign - a super admin assigning branch + role to a
// pending account (first-time Google sign-in with nobody set up yet).
router.post("/:uid/assign", requireSuperAdmin, async (req, res) => {
  if (!requireServiceAccount(res)) return;
  const { role, business_id } = req.body || {};
  if (!role || !business_id) return res.status(400).json({ error: "role and business_id are required" });
  try {
    const existing = await adminAuth.getUser(req.params.uid);
    await adminAuth.setCustomUserClaims(req.params.uid, { ...(existing.customClaims || {}), role, business_id });
    await syncBusinessMembership(req.idToken, business_id, existing.email, role);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
