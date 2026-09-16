# BGO App Data Server

The backend that finally gives BGO Shine Hub a real, shared database. Every
business record - businesses, washes, payments, staff, services, inventory,
loyalty customers, schedules, CCTV feeds, job orders, memberships,
subscriptions, notifications, invitations, and user profiles - now lives in
a MySQL database on your cPanel hosting instead of each browser's own
private IndexedDB copy. Sign in from a laptop, a phone, or a different
computer entirely, and you see the same data.

`src/lib/localDb.js` in the main app talks to this server. Its exported
shape (`get`, `getAll`, `put`, `delete`, `query`, `subscribe`) is identical
to what it used to be for IndexedDB, so nothing else in the app had to
change - every page that used to read/write `localDb` still does, it just
now goes over the network to here.

## Why one generic table

Rather than a separate MySQL table per entity (16+ near-identical tables),
this uses one `records` table with a `collection` column (`"businesses"`,
`"washes"`, etc.) and a `data` JSON column holding the whole record. That
mirrors exactly how IndexedDB stored things (loosely-shaped JS objects keyed
by id) - no rigid schema to maintain, and adding a new collection later
needs zero migration. Filtering, sorting, and limiting happen in this
server's own code (not generated SQL), copied exactly from the equality-match
logic `src/lib/localDb.js` used to run in the browser, so behavior can never
drift from what every page already expected.

## Running it

```bash
cd app-data-server
npm install
cp env.example .env
```

### 1. Create the database in cPanel

MySQL Database Wizard -> create a database and a user, grant the user ALL
PRIVILEGES on it. cPanel prefixes both names with your account username
(e.g. `fjvwkkmge_bgo_data`, `fjvwkkmge_bgo_app`) - use the full prefixed
names. Put the database name, username, password, host (almost always
`localhost`), and port (usually `3306`) into `.env`.

### 2. Start it

```bash
npm run dev      # or: npm start
```

It automatically creates its one table on first run - no manual SQL needed.
It does **not** load any demo data by default, so a fresh database stays
genuinely empty, ready to set up your real business through the app itself.
If you ever want the demo Njiru/Kayole/Utawala dataset loaded (e.g. for a
throwaway QA/staging database), either set `SEED_DEMO_DATA=true` in `.env`
before first starting the server, or run `npm run seed` any time - both are
a no-op the moment the database already has any businesses in it, so this
is always safe to leave alone.

Runs on `http://localhost:4051` by default. The main app's `.env` needs
`VITE_APP_DATA_API_URL` pointing at it if you change the port - and for
local development, this server (and its database) now has to be running
for the app to show any data at all, since there's no more IndexedDB
fallback.

## Endpoints

All require `Authorization: Bearer <Firebase ID token>`, with one exception:
`GET /api/data/invitations` (and `/:id`) is open, because
`src/pages/JoinBusiness.jsx` looks up an invite token before anyone has
signed in - the token itself is what gates access to that one record, same
as when invitations lived in local IndexedDB.

- `GET /api/data/:collection` - all records, or `?where=<json>` (equality
  filter, e.g. `{"business_id":"abc"}`), `&orderBy=<field or -field>`,
  `&limit=<n>`.
- `GET /api/data/:collection/:id` - one record, or `null`.
- `PUT /api/data/:collection/:id` - upsert (body is the full, already-merged
  record object).
- `DELETE /api/data/:collection/:id`
- `GET /health` - `{ ok: true, dbConfigured }`.

## Notes / limitations

- No true realtime push - the two places that used to get instant same-tab
  updates (`src/hooks/useBusinessScopeData.js`'s wash/payment subscriptions)
  now poll every 15 seconds instead. Fine for a car wash's pace of change;
  revisit with WebSockets/SSE if that's ever not enough.
- No per-role enforcement server-side yet - same caveat as the other
  backends here: fine behind a private network talking only to this one
  frontend, add real authorization checks before exposing this publicly.
- Uploaded photos are still base64 data URLs embedded directly in whatever
  record references them (unchanged from the IndexedDB days) - fine for now,
  but real file storage would be a better fit at scale.
