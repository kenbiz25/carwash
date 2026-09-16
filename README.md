# BGO Shine Hub

A React + Vite web app for managing BGO Shine Hub's car wash operations - job
orders, staff, inventory, services, memberships, loyalty, payments, and
reporting - plus a public site and customer portal for booking and checking
wash history.

**Business**: BGO Shine Hub, Njiru, Nairobi (plus Kayole and Utawala
branches). Professional car wash, interior cleaning, engine greasing and air
freshening - **open 24 hours a day, 7 days a week**. Production domain:
**bgoshinehub.co.ke**.

## Tech stack

- React 18 + Vite 6, Tailwind CSS + Radix UI, React Router, React Query
- Leaflet / React-Leaflet for the branch-locations map
- Firebase Auth for sign-in - email/password, Google, and admin-issued
  username/phone logins (see "Staff logins & sign-in methods" below)
- A real MySQL database for every business record (businesses, washes,
  payments, staff, services, inventory, and the rest), reached through a
  small backend, `app-data-server/` - not Firestore, not browser storage.
  `src/lib/localDb.js` is the frontend client for it; the name and interface
  are kept from an earlier browser-only IndexedDB version on purpose, so
  every page that already used it needed zero changes when the storage
  layer moved to a real database

## Architecture at a glance

One frontend, one shared database, four small standalone backends - each
its own folder with its own `package.json`, `.env`, and `README.md`:

| Backend             | What it's for                                                | Gitignored |
| -------------------- | ------------------------------------------------------------ | :--------: |
| `app-data-server/`   | Every business record - the real MySQL database              | ✅ |
| `user-admin-server/` | Creating staff logins, resetting passwords, assigning roles   | ✅ |
| `mpesa-server/`      | M-Pesa STK Push payments                                      | ✅ |
| `whatsapp-server/`   | Customer WhatsApp notifications                               | ✅ |

They're gitignored because each ends up holding a real secret once
configured (a database password, a Firebase service account key, payment
provider credentials, or a Meta access token) that must never reach the
browser or a public repo. The frontend talks to all four over plain HTTP,
each pointed at by its own `VITE_*_API_URL` in `.env`.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at the URL Vite prints (default `http://localhost:5173`,
often reassigned to another port if that one's busy). On its own this shows
the UI, but **no data will load** until `app-data-server` is also running
against a real database - there's no more browser-storage fallback:

```bash
cd app-data-server && npm install && cp env.example .env
# fill in .env with your MySQL credentials, then:
npm run dev
```

To create staff logins / manage roles, take M-Pesa payments, or send
WhatsApp notifications, also run those backends the same way:

```bash
cd user-admin-server && npm install && cp env.example .env && npm run dev
cd mpesa-server        && npm install && cp env.example .env && npm run dev
cd whatsapp-server      && npm install && cp env.example .env && npm run dev
```

Each has its own README with full setup details.

### Environment

Copy `.env` and fill in the Google Maps API key used for location
autocomplete in Settings / Business Manager, and each backend's
`VITE_*_API_URL` if you've changed its port. Firebase Auth config is inline
in `src/lib/firebase.js` (project: `njiru-carwash`).

### Test / demo accounts

These are real Firebase Auth accounts, each a member of the seeded "BGO
Shine Hub - Njiru" business with the matching role. All five share one
password.

| Role        | Email                            | Password        |
| ----------- | --------------------------------- | ---------------- |
| Owner       | `qa-owner@bgoshinehub.demo`       | `BgoDemo123!`    |
| Manager     | `qa-manager@bgoshinehub.demo`     | `BgoDemo123!`    |
| Staff       | `qa-staff@bgoshinehub.demo`       | `BgoDemo123!`    |
| Cashier     | `qa-cashier@bgoshinehub.demo`     | `BgoDemo123!`    |
| Super Admin | `qa-superadmin@bgoshinehub.demo`  | `BgoDemo123!`    |

These only resolve to their role once the matching Firebase custom claim is
set (see `scripts/create-super-admin.mjs` and "Staff logins & sign-in
methods" below) - a fresh, unseeded database on its own doesn't grant any
role to any account.

To add a new staff login, use **My Business → Team → Staff Logins** as an
owner/manager/super admin. To grant a brand new super admin (there's no
in-app way to create the first one), see the next section.

### Creating a super admin

```bash
SUPER_ADMIN_EMAIL=you@example.com \
SUPER_ADMIN_PASSWORD='...' \
FIREBASE_SERVICE_ACCOUNT_JSON='<same value as user-admin-server/.env>' \
VITE_FIREBASE_API_KEY=<from the repo root .env> \
node scripts/create-super-admin.mjs
```

Creates the Firebase Auth account if it doesn't already exist (or signs
into it, if it does) and grants it the platform-wide `admin` role via a
Firebase custom claim - no business/branch, since a super admin isn't
scoped to one. Sign out and back in for the role to take effect.

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - production build to `dist/`
- `npm run preview` - preview the production build locally
- `npm run lint` / `npm run lint:fix` - ESLint
- `npm run typecheck` - type-check with `tsc` against `jsconfig.json`
- `node scripts/create-super-admin.mjs` - see above

`scripts/` also has other one-off Node tools used to seed/export demo data
during development - not part of the running app.

## Project structure

```text
src/
  pages/       route-level views (Dashboard, JobOrders, Staff, Inventory, ...)
  components/  shared UI components
  api/         data access layer (firebaseClient.js - same interface, backed by localDb)
  hooks/       shared React hooks
  lib/         localDb (app-data-server client), Firebase Auth, utilities
public/img/    logo assets - main.png (full logo) and meta.png (icon mark, used for
               favicon and social/meta previews)
app-data-server/    MySQL-backed data API - see its own README
user-admin-server/  staff logins, password resets, role assignment - see its own README
mpesa-server/       M-Pesa STK Push - see its own README
whatsapp-server/    WhatsApp notifications - see its own README
```

## Roles

Five roles: `superadmin` (platform-wide, not tied to any one business) and,
per business, `owner`, `manager`, `cashier`, `staff` (resolved from that
business's `members[]` array, or from a Firebase custom claim for accounts
created via Staff Logins - see below). An owner can belong to several
businesses/branches at once and switches between them with the branch
picker in the sidebar or top bar; every other role belongs to exactly one
branch.

### What each role can do

Enforcement today is at the navigation level (a role that can't see a link
in the sidebar has no in-app way to reach that page) - see "Multi-branch &
data isolation" below for how records themselves stay scoped to one branch
regardless of who's looking.

| Area                         | Superadmin | Owner | Manager | Cashier | Staff |
| ---------------------------- | :--------: | :---: | :-----: | :-----: | :---: |
| Dashboard (own branch)       |     -¹     |  ✅   |   ✅    |   ✅    |  ✅   |
| Super Admin dashboard (all businesses, platform revenue/MRR) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create a new branch          |     ✅     |  ✅   |   ❌    |   ❌    |  ❌   |
| Edit branch info / manage team, invites | ❌ |  ✅   |   ✅    |   ❌    |  ❌   |
| Create/manage staff logins    |     ✅     |  ✅   |   ✅    |   ❌    |  ❌   |
| Active Washes / Job Orders (view + check in vehicles) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pause or delete a started wash (with a reason) | ❌ | ✅ | ✅ | ❌ | ❌ |
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

¹ Superadmin lands on the Super Admin dashboard, not a branch dashboard - a
superadmin has no branch membership of their own to show one for.

Staff get a restricted dashboard focused on their own assigned jobs and
today's washes rather than branch-wide figures; cashiers get a
collections-focused view. Everyone gets the public pages regardless of
role: the marketing homepage, each branch's own page (see below), and the
customer portal. **Help & Support** (`/Help`) is the one exception that
flipped the other way - it used to be public and is now staff-only, behind
login, since its content is written for staff, not customers.

## Staff logins & sign-in methods

Login accepts four things in one field: a real email, a Google account, a
manager-issued **username**, or a manager-issued **phone number**.

- **Owners** self-serve as before - sign up (email or Google) and set up
  their own business from Settings.
- **Staff** either sign in with the username or phone number their
  manager/owner/super admin gave them (created from **My Business → Team →
  Staff Logins**, which also resets anyone's password directly - there's no
  self-service reset for these, since there's no real inbox behind a
  username or phone login), or sign in with Google directly - a first-time
  Google sign-in with no invite pending lands in a "pending" state until a
  **super admin** assigns their branch and role from the Super Admin
  dashboard's "Pending Sign-ups" panel.

The role and branch travel as a Firebase custom claim on the account
itself, so they apply the moment that person signs in **on any device**,
not just the one they were created on - this is powered by
`user-admin-server/`, which holds the Firebase service account key these
privileged actions need. Unlike the other backends, there's no mock mode
for it: the accounts it creates must be real Firebase Auth accounts for
that person to actually log in.

## Multi-branch & data isolation

Each branch (Njiru, Kayole, Utawala, or any new one) is its own `business`
record with its own `id`. Every operational record - washes, payments,
staff, services, job orders, loyalty customers - carries a `business_id`
tying it to exactly one branch, and every page resolves "which branch am I
looking at" through a single hook, `useBusiness()`
(`src/lib/BusinessContext.jsx`). There's no page that reads a different,
independent notion of "current business."

An owner who belongs to more than one branch gets a branch switcher in both
the sidebar and the top bar; everyone else belongs to exactly one branch and
never sees it. Switching branches persists across a refresh (scoped per
account, so it's safe on a shared machine) and immediately refetches every
branch-scoped query - nothing from the previous branch lingers on screen.

**Branch pages**: each branch also has its own lightweight public page at
`/<slug>` (e.g. `/njiru`, `/kayole`, `/utawala`) - photos, phone, address, a
WhatsApp booking link and directions - separate from the main marketing
homepage. New branches get a slug and default photo set automatically when
created; see `src/pages/BranchPage.jsx`.

## Wash workflow

Check-in → Start Washing → Mark Done → Process Payment. Once a wash has
started, pausing it or deleting it both require a reason and are
owner/manager-only (staff can't unilaterally abandon or erase a job they
started) - see `src/pages/WashDetails.jsx` / `src/pages/Washes.jsx`. A
paused wash stays visible in every active-work list until resumed; a
deleted (cancelled) wash is a soft delete - it stays on record for audit,
but is excluded from wash-count and revenue totals everywhere in the app.

## M-Pesa

Real M-Pesa payments (STK Push / Lipa Na M-Pesa Online) need a server that
holds Safaricom's consumer secret and passkey and that Safaricom can call
back - a browser-only app can't do either safely. That backend lives in its
own folder, `mpesa-server/` (see its own README for full setup, including
how to get real sandbox/production credentials and how to expose the
callback URL with a tunnel).

It currently runs in **mock mode** - no real Safaricom credentials are set
yet, so `MPESA_ENV=mock` in `mpesa-server/.env` simulates the whole flow
(STK push accepted → auto-"completes" a few seconds later with a fake
receipt) without needing any. Flipping to real payments later is a matter of
filling in `mpesa-server/.env` with real credentials and setting
`MPESA_ENV=sandbox` (then `production`) - no frontend code changes needed.

From `Payments → Process Payment → M-Pesa`, the flow is: the dialog asks
`mpesa-server` to start an STK push, polls it for the result, and - once
confirmed - writes the payment and marks the wash paid in the app's own
database. That last step is what makes a completed payment show up on the
Dashboard/Payments page immediately, with no manual refresh.

## WhatsApp

Customer notifications (payment confirmed, car ready for pickup) go out over
WhatsApp rather than SMS. Same reasoning as M-Pesa: sending needs a real
access token that can't sit in the browser, and Meta needs a public webhook
to call back with delivery status - so this is its own folder,
`whatsapp-server/` (see its own README for full setup, including getting
real credentials from Meta and exposing the webhook with a tunnel).

It currently runs in **mock mode** - no real Meta credentials are set yet,
so a "send" is logged and marked sent instantly, no external call made.
Flipping to real sends later is a matter of filling in
`whatsapp-server/.env` with real credentials and setting `WHATSAPP_ENV=live` -
no frontend code changes needed. Note that WhatsApp only allows free-form
text within 24 hours of the customer's last message; these are all
business-initiated notifications, so going live means sending pre-approved
message **templates**, not plain text (see `whatsapp-server/README.md`).

Two places trigger a WhatsApp send today: marking a wash "Done" in Active
Washes messages the customer their car is ready, and confirming a payment
sends a receipt. Both go through
`src/components/notifications/NotificationService.jsx`, which also has
templates defined for loyalty updates, low-stock alerts and shift
reminders - those exist but aren't wired to a trigger yet.

## SEO

`public/robots.txt` and `public/sitemap.xml` are set up for the production
domain - the sitemap lists the marketing homepage and each branch's public
page; everything behind login (Dashboard, Help, Settings, and the rest) is
disallowed. Update both if branches or public routes change.

## Hosting

The frontend build (`dist/`) and the four standalone backends are all meant
to run under cPanel - each backend already reads its port from
`process.env`, matching cPanel's Node.js App Manager (Phusion Passenger),
which assigns the port itself and expects an `index.js` entry point.

Suggested layout - one subdomain per backend, each set up as its own cPanel
Node.js App pointed at that folder's `index.js`:

| App                 | Suggested (sub)domain        |
| -------------------- | ----------------------------- |
| Frontend (`dist/`)   | `bgoshinehub.co.ke`          |
| `mpesa-server`       | `mpesa.bgoshinehub.co.ke`    |
| `whatsapp-server`    | `whatsapp.bgoshinehub.co.ke` |
| `user-admin-server`  | `users.bgoshinehub.co.ke`    |
| `app-data-server`    | `data.bgoshinehub.co.ke`     |

`.env.production` at the repo root already points the frontend's
`VITE_*_API_URL` vars at these - update it if you use different
subdomains/paths. Each backend's own `.env` (not `env.example`) needs
`CORS_ORIGIN=https://bgoshinehub.co.ke` in production.

For `app-data-server` specifically: create the MySQL database and a user
via cPanel's MySQL Database Wizard first (see its README for the exact
steps) - a fresh database starts genuinely empty by default (no demo data
loaded), so real production data can never get mixed up with test data. The
demo Njiru/Kayole/Utawala dataset only loads if you explicitly ask for it
(`SEED_DEMO_DATA=true` or `npm run seed` inside that folder), for a
throwaway QA/staging database.

One more manual step for Google sign-in to work on the live domain: Firebase
Console → Authentication → Settings → **Authorized domains** → add
`bgoshinehub.co.ke` (it only trusts `localhost` and Firebase's own domains
by default).
