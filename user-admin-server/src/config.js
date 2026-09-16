import "dotenv/config";

// Some hosts (cPanel/CloudLinux's Node.js Selector included) pass env vars
// through a shell `export` statement - a raw JSON secret full of quotes and
// newlines (the private key) doesn't survive that intact, e.g. every `"`
// silently disappearing. FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 sidesteps this
// entirely (base64 is just [A-Za-z0-9+/=], nothing a shell can mangle) and
// is tried first; FIREBASE_SERVICE_ACCOUNT_JSON (plain JSON) still works
// for hosts/setups where pasting it directly is safe, e.g. local .env.
function readServiceAccountJson() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
}

export const config = {
  projectId: process.env.FIREBASE_PROJECT_ID || "njiru-carwash",
  serviceAccountJson: readServiceAccountJson(),
  syntheticEmailDomain: process.env.SYNTHETIC_EMAIL_DOMAIN || "users.bgoshinehub.internal",
  syntheticPhoneDomain: process.env.SYNTHETIC_PHONE_DOMAIN || "phone.bgoshinehub.internal",
  port: Number(process.env.PORT) || 4041,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5183",
  // Where the shared business database lives - creating a business-scoped
  // login (owner/manager/cashier/staff) needs to add this person to that
  // business's own member list too, since that's what every page actually
  // reads to resolve someone's role on a business (the custom claim below
  // is what makes the business show up for them at all across devices, but
  // isn't itself read for role display - keeping both in sync here avoids
  // needing to change every page that reads business.members).
  appDataApiUrl: process.env.APP_DATA_API_URL || "http://localhost:4051",
};

// No service account = token verification still works (it only needs the
// public project id), but any endpoint that creates/edits a real Firebase
// Auth user (create, reset password, assign role) will refuse with a clear
// error until one is added - there's no meaningful "mock" for that part.
export const hasServiceAccount = Boolean(config.serviceAccountJson);

if (!hasServiceAccount) {
  console.warn(
    "[user-admin-server] No FIREBASE_SERVICE_ACCOUNT_JSON set - sign-in verification works, " +
    "but creating users, resetting passwords, and assigning roles will fail until you add one. See env.example."
  );
}
