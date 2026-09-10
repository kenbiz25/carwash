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

## Hosting

Currently local-only (see Tech stack). Planned: a MySQL/MariaDB database via
cPanel hosting — not yet implemented, `src/api/firebaseClient.js` is the
single place that would need to change to point at a real backend API
instead of `localDb`.
