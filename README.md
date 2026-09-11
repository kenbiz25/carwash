# BGO Shine Hub

A React + Vite web app for managing BGO Shine Hub's car wash operations —
job orders, staff, inventory, services, memberships, loyalty, payments, and
reporting — plus a public site and customer portal for booking and checking
wash history.

**Business**: BGO Shine Hub, Njiru, Nairobi (plus Kayole and Utawala
branches). Professional car wash, interior cleaning, engine greasing and air
freshening — **open 24 hours a day, 7 days a week**.

## Tech stack

- React 18 + Vite 6
- Firebase Auth (email/password) for sign-in — this is the *only* remaining
  Firebase dependency
- All app data (businesses, washes, payments, staff, inventory, etc.) lives
  in the browser via IndexedDB (`src/lib/localDb.js`), seeded from
  `src/lib/local-seed-data.json` on first run — kept fully local until a
  hosting/database decision is made (see "Hosting" below)
- Tailwind CSS + Radix UI components
- React Router, React Query
- Leaflet / React-Leaflet for the branch-locations map

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at the URL Vite prints (default `http://localhost:5173`,
often reassigned to another port if that one's busy).

To take M-Pesa payments (see "M-Pesa" below) or send WhatsApp notifications
(see "WhatsApp" below), also run those separate backends:

```bash
cd mpesa-server && npm install && npm run dev
cd whatsapp-server && npm install && npm run dev
```

### Environment

Copy `.env` and fill in the Google Maps API key used for location
autocomplete in Settings / Business Manager. Firebase Auth config is inline
in `src/lib/firebase.js` (project: `carwash-managerke`).

### Test / demo accounts

These are real Firebase Auth accounts (auth is the one piece of this app that
isn't local-only), each a member of the seeded "BGO Shine Hub - Njiru"
business with the matching role, verified working as of this doc update. All
five share one password.

| Role        | Email                            | Password        |
| ----------- | -------------------------------- | --------------- |
| Owner       | `qa-owner@bgoshinehub.demo`      | `BgoDemo123!`   |
| Manager     | `qa-manager@bgoshinehub.demo`    | `BgoDemo123!`   |
| Staff       | `qa-staff@bgoshinehub.demo`      | `BgoDemo123!`   |
| Cashier     | `qa-cashier@bgoshinehub.demo`    | `BgoDemo123!`   |
| Super Admin | `qa-superadmin@bgoshinehub.demo` | `BgoDemo123!`   |

The `kenbiz25+...@gmail.com` accounts referenced in `local-seed-data.json`'s
`owner_email`/`members` fields are the *original* seeded identities — they're
real Firebase accounts too, but their passwords aren't recorded anywhere in
this repo, so don't rely on them for testing. The `qa-*` accounts above were
created specifically to have known-working credentials.

To add another `qa-*`-style account for a new role or branch: send an invite
from **My Business → Team** (as an owner) or **Super Admin**, copy the invite
link it generates (`/JoinBusiness?token=...`), and sign up through it.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run typecheck` — type-check with `tsc` against `jsconfig.json`

`scripts/` also has one-off Node tools used to seed/export demo data during
development (they talk directly to Firebase Auth + the local data shape —
not part of the running app).

## Project structure

```text
src/
  pages/       route-level views (Dashboard, JobOrders, Staff, Inventory, ...)
  components/  shared UI components
  api/         data access layer (firebaseClient.js — same interface, backed by localDb)
  hooks/       shared React hooks
  lib/         localDb (IndexedDB), Firebase Auth, utilities
public/img/    logo assets — main.png (full logo) and meta.png (icon mark, used for
               favicon and social/meta previews)
```

## Roles

Five roles: `superadmin` (platform-wide, a flag on the user's own profile —
not tied to any one business) and, per business, `owner`, `manager`,
`cashier`, `staff` (resolved from that business's `members[]` array). An
owner can belong to several businesses/branches at once and switches between
them with the branch picker in the sidebar; every other role belongs to
exactly one branch.

### What each role can do

Enforcement today is at the navigation level (a role that can't see a link
in the sidebar has no in-app way to reach that page) — see "Multi-branch
data isolation" below for how records themselves stay scoped to one branch
regardless of who's looking.

| Area                         | Superadmin | Owner | Manager | Cashier | Staff |
| ---------------------------- | :--------: | :---: | :-----: | :-----: | :---: |
| Dashboard (own branch)       | —¹         |  ✅   |   ✅    |   ✅    |  ✅   |
| Super Admin dashboard (all businesses, platform revenue/MRR) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create a new branch          |     ✅     |  ✅   |   ❌    |   ❌    |  ❌   |
| Edit branch info / manage team, invites | ❌ |  ✅   |   ✅    |   ❌    |  ❌   |
| Active Washes / Job Orders (view + check in vehicles) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Assign staff to a job         |     ❌     |  ✅   |   ✅    |   ✅    |  ❌   |
| Record a payment              |     ❌     |  ✅   |   ✅    |   ✅    |  ❌   |
| View payments ledger          |     ❌     |  ✅   |   ✅    |   ✅    |  ❌   |
| Staff & Commissions (add/edit/pay staff) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Services & Catalogue (edit prices) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Inventory                     |     ❌     |  ✅   |   ✅    |   ❌    |  ❌   |
| Loyalty & Members             |     ❌     |  ✅   |   ✅    |   ✅    |  ❌   |
| Reports & Analytics           |     ❌     |  ✅   |   ✅    |   ✅    |  ❌   |
| Subscriptions / membership plans | ❌      |  ✅   |   ❌    |   ❌    |  ❌   |
| Settings & Users              |     ❌     |  ✅   |   ❌    |   ❌    |  ❌   |

¹ Superadmin lands on the Super Admin dashboard, not a branch dashboard — a
superadmin has no branch membership of their own to show one for.

Staff get a restricted dashboard focused on their own assigned jobs and
today's washes rather than branch-wide figures; cashiers get a
collections-focused view. Everyone gets the public pages regardless of
role: the marketing homepage, each branch's own page (see below), and the
customer portal.

## Multi-branch & data isolation

Each branch (Njiru, Kayole, Utawala, or any new one) is its own `business`
record with its own `id`. Every operational record — washes, payments,
staff, services, job orders, loyalty customers — carries a `business_id`
tying it to exactly one branch, and every page resolves "which branch am I
looking at" through a single hook, `useBusiness()`
(`src/lib/BusinessContext.jsx`). There's no page that reads a different,
independent notion of "current business" — that used to not be true (the
Dashboard kept its own separate branch-selection state that could silently
drift from the sidebar's), and fixing that drift was a deliberate piece of
this work, not an assumption.

An owner who belongs to more than one branch gets a branch switcher in the
sidebar; everyone else belongs to exactly one branch and never sees it.
Switching branches persists across a refresh (scoped per account, so it's
safe on a shared machine) and immediately refetches every branch-scoped
query — nothing from the previous branch lingers on screen.

This was verified with an automated test, not just by reading the code: a
staff record was created while viewing Njiru, the branch was switched to
Kayole, and the test asserted that record was invisible from Kayole — plus
that a hard refresh doesn't silently drop you back onto a different branch
than the one you were just on.

**Branch pages**: each branch also has its own lightweight public page at
`/<slug>` (e.g. `/njiru`, `/kayole`, `/utawala`) — photos, phone, address,
a WhatsApp booking link and directions — separate from the main marketing
homepage. New branches get a slug and default photo set automatically when
created; see `src/pages/BranchPage.jsx`.

## M-Pesa

`mpesa-server/` is kept out of this repo (it's gitignored) since it's where
real payment-provider secrets eventually live — it exists locally but isn't
pushed. The section below documents it for whoever has that folder; without
it, the M-Pesa tab in the payment dialog has nothing to talk to.

Real M-Pesa payments (STK Push / Lipa Na M-Pesa Online) need a server that
holds Safaricom's consumer secret and passkey and that Safaricom can call
back — a browser-only app can't do either safely. That backend lives in its
own folder, `mpesa-server/`, with its own `package.json` and its own single
`.env` for every M-Pesa secret (see `mpesa-server/README.md` for full setup,
including how to get real sandbox/production credentials and how to expose
the callback URL with a tunnel).

It currently runs in **mock mode** — no real Safaricom credentials are set
yet, so `MPESA_ENV=mock` in `mpesa-server/.env` simulates the whole flow
(STK push accepted → auto-"completes" a few seconds later with a fake
receipt) without needing any. Flipping to real payments later is a matter of
filling in `mpesa-server/.env` with real credentials and setting
`MPESA_ENV=sandbox` (then `production`) — no frontend code changes needed.

From `Payments → Process Payment → M-Pesa`, the flow is: the dialog asks
`mpesa-server` to start an STK push, polls it for the result, and — once
confirmed — writes the payment and marks the wash paid in the app's own data
store. That last step is what makes a completed payment show up on the
Dashboard/Payments page immediately, with no manual refresh.

## WhatsApp

Customer notifications (payment confirmed, car ready for pickup) go out over
WhatsApp rather than SMS. Same reasoning as M-Pesa: sending needs a real
access token that can't sit in the browser, and Meta needs a public webhook
to call back with delivery status — so this is its own gitignored folder,
`whatsapp-server/`, with its own `.env` (see `whatsapp-server/README.md` for
full setup, including getting real credentials from Meta and exposing the
webhook with a tunnel).

It currently runs in **mock mode** — no real Meta credentials are set yet,
so a "send" is logged and marked sent instantly, no external call made.
Flipping to real sends later is a matter of filling in
`whatsapp-server/.env` with real credentials and setting `WHATSAPP_ENV=live`
— no frontend code changes needed. Note that WhatsApp only allows free-form
text within 24 hours of the customer's last message; these are all
business-initiated notifications, so going live means sending pre-approved
message **templates**, not plain text (see `whatsapp-server/README.md`).

Two places trigger a WhatsApp send today: marking a wash "Done" in Active
Washes (`src/pages/Washes.jsx`) messages the customer their car is ready,
and confirming a payment (`PaymentDialog.jsx`) sends a receipt. Both go
through `src/components/notifications/NotificationService.jsx`, which also
has templates defined for loyalty updates, low-stock alerts and shift
reminders — those exist but aren't wired to a trigger yet.

## Staff Logins & Roles

Owners, managers and super admins can create a staff login directly — a
username + password, no email or invite link needed — from **My Business →
Team → Staff Logins**, and reset anyone's password the same way. The role
and branch travel as a Firebase custom claim on the account itself, so they
apply the moment that person signs in **on any device**, not just the one
they were created on (everything else in this app is per-browser local
storage — see "Multi-branch & data isolation" above — this is the one
exception, by design).

Signing in also now accepts Google, in addition to email/password:

- **Owners** self-serve as before — sign up (email or Google) and set up
  their own business from Settings.
- **Staff** either sign in with the username their manager gave them (the
  "Email or Username" field on Login accepts both), or sign in with Google
  directly — a first-time Google sign-in with no invite pending lands in a
  "pending" empty state until a **super admin** assigns their branch and
  role from the Super Admin dashboard's "Pending Sign-ups" panel.

This is powered by `user-admin-server/`, another standalone gitignored
backend (same shape as `mpesa-server`/`whatsapp-server`) — it holds the
Firebase service account key needed for these privileged actions, which must
never reach the browser. See `user-admin-server/README.md` for setup;
**unlike** the other two backends, there's no mock mode for it, since the
accounts it creates must be real Firebase Auth accounts for that person to
actually log in.

## Hosting

Production domain: **bgoshinehub.co.ke**. The frontend build (`dist/`) and
the three standalone backends (`mpesa-server/`, `whatsapp-server/`,
`user-admin-server/`) are all meant to run under cPanel — each backend
already reads its port from `process.env`, matching cPanel's Node.js App
Manager (Phusion Passenger), which assigns the port itself and expects an
`index.js` entry point.

Suggested layout — one subdomain per backend, each set up as its own
cPanel Node.js App pointed at that folder's `index.js`:

| App               | Suggested (sub)domain              |
| ------------------ | ---------------------------------- |
| Frontend (`dist/`) | `bgoshinehub.co.ke`                |
| `mpesa-server`      | `mpesa.bgoshinehub.co.ke`          |
| `whatsapp-server`   | `whatsapp.bgoshinehub.co.ke`       |
| `user-admin-server` | `users.bgoshinehub.co.ke`          |

`.env.production` at the repo root already points the frontend's
`VITE_*_API_URL` vars at these — update it if you use different
subdomains/paths. Each backend's own `.env` (not `env.example`) needs
`CORS_ORIGIN=https://bgoshinehub.co.ke` in production.

One more manual step for Google sign-in to work on the live domain: Firebase
Console → Authentication → Settings → **Authorized domains** → add
`bgoshinehub.co.ke` (it only trusts `localhost` and Firebase's own domains
by default).

App data itself (businesses, washes, payments, staff, inventory, etc.) is
still local-only (see Tech stack). Planned: a MySQL/MariaDB database via
cPanel hosting for that too — not yet implemented, `src/api/firebaseClient.js`
is the single place that would need to change to point at a real backend API
instead of `localDb`.
# carwash
