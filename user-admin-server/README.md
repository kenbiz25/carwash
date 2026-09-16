# BGO User Admin Server

A small standalone backend that lets owners, managers and super admins
create staff logins (username + password), reset a password directly, and
assign a branch/role to a first-time Google sign-in - all privileged
[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) actions
the browser can never be trusted to hold the credentials for.

The main app (`BusinessManager.jsx`'s Team tab, and the Super Admin
dashboard's "Pending Sign-ups" panel, both via `src/lib/userAdminClient.js`)
calls this server; this server calls Firebase Auth.

## Why a separate server at all

Firebase's client SDK can only ever manage the *currently signed-in* user -
there's no way for an owner to create someone else's account, or overwrite
someone else's password, without either signing out of their own session or
holding a service account key (which must never reach the browser). The
Admin SDK can do both, but only from a trusted backend.

## How roles travel across devices

Nothing here uses a database. Role and branch are stored as a
[custom claim](https://firebase.google.com/docs/auth/admin/custom-claims) on
the person's Firebase Auth account itself (`{ role, business_id, username }`) -
so the moment they sign in on *any* device and get a fresh ID token, the
app already knows who they are. The main app reads these claims in
`src/api/firebaseClient.js`'s `auth.me()`.

## Running it

```bash
cd user-admin-server
npm install
cp env.example .env
npm run dev      # or: npm start
```

Runs on `http://localhost:4041` by default (see `.env` → `PORT`). The main
app's `.env` needs `VITE_USER_ADMIN_API_URL` pointing at it if you change the
port. Both the Vite dev server and this one need to be running for the Team
tab's "Create Login" / "Reset Password" and the Super Admin "Pending
Sign-ups" panel to work.

## Getting a service account (required - no mock mode here)

Unlike `mpesa-server`/`whatsapp-server`, there's no meaningful mock mode for
this one: creating a user here creates a *real* Firebase Auth account, which
is the only way that person can actually sign in through the app (which
always talks to the real Firebase project, never a mock). Until a service
account is set, the server still starts and can verify who's calling
(`verifyIdToken` only needs the public project id), but create/reset/assign
requests get a clear "not configured yet" error instead of crashing.

1. Firebase Console → your project → ⚙️ **Project settings** → **Service
   accounts** tab → **Generate new private key**.
2. Open the downloaded JSON and paste its entire contents as **one line**
   into `.env` as `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Restart the server.

## Endpoints

All except `/health` require `Authorization: Bearer <Firebase ID token>`,
which confirms the caller is a real signed-in user. On top of that, every
route below also checks the caller's own `role` custom claim server-side
(not just in the UI) before acting on someone else's login:

- `POST /api/users` - owner, manager, or super admin only. Body
  `{ username, password, full_name, role, business_id }`. Creates a Firebase
  Auth account under a fake `@users.bgoshinehub.internal` email (Firebase
  Auth's email/password provider needs an email-shaped identifier) and tags
  it with the given role/branch. Returns `{ uid, email }`.
- `GET /api/users?business_id=...` - owner, manager, or super admin only.
  Lists one branch's logins created this way; `business_id` is required
  unless the caller is a super admin (nobody else has a reason to list every
  login platform-wide).
- `GET /api/users/pending` - super admin only. Accounts with no role/branch
  claim yet (mainly first-time Google sign-ins).
- `POST /api/users/:uid/reset-password` - owner, manager, or super admin
  only. Body `{ password }`.
- `DELETE /api/users/:uid` - owner, manager, or super admin only. Permanently
  deletes the login (e.g. an employee who has left) and drops them from
  their business's member list.
- `POST /api/users/:uid/assign` - super admin only. Body
  `{ role, business_id }` - sets the claim for a pending account.
- `GET /health` - `{ ok: true, adminConfigured }`.

Note this checks *role* only, not which specific business the caller
belongs to - an owner/manager of one branch can still act on another
branch's logins via these endpoints. That's a smaller gap than the previous
"any signed-in account, any role" state, but closing it fully would mean
looking up business membership (not just the role claim) on every call.

## Notes / limitations

- Usernames are just a fixed fake email domain under the hood - a real email
  address still works too (the login field on the sign-in page accepts
  either and only rewrites values without an "@").
- Listing users (`GET /api/users`, `/pending`) calls `listUsers()` and
  filters in memory - fine at the scale of a few branches' staff, would need
  paging at real scale.
- No per-role enforcement server-side yet - same caveat as `mpesa-server` /
  `whatsapp-server`: fine behind a private network talking only to this one
  frontend; add real authorization checks (e.g. verifying the caller's own
  claim before letting them create a user for a *different* business) before
  exposing this publicly.
