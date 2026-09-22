# BGO Combined Server

Originally just the WhatsApp notification backend - now also runs what used
to be `user-admin-server` (staff login admin, via `/api/users`) and
`app-data-server` (the shared MySQL data store, via `/api/data`,
`/api/vision`, `/api/public`), merged into this one process.

## Why one process

cPanel's Node.js App Manager (Phusion Passenger) counts each app against the
account's overall process limit. Running four separate apps
(`mpesa-server`, `whatsapp-server`, `user-admin-server`, `app-data-server`)
maxed that limit out with plenty of headroom left on memory/disk/bandwidth -
the process count was the actual bottleneck, not resources money would fix.
`mpesa-server` stays separate since it handles time-sensitive Safaricom
payment callbacks and shouldn't share fate with the others; the other three
were merged here, cutting 4 cPanel Node apps down to 2.

Each half keeps its own code and route prefix exactly as it had before the
merge - `src/userAdmin/` and `src/appData/` mirror the old
`user-admin-server/src/` and `app-data-server/src/` folders almost file for
file. The only real change is a single shared `src/firebaseAdmin.js` (both
halves used to call `admin.initializeApp()` independently, which throws
"default app already exists" the moment they're loaded into the same
process) and one combined `index.js` mounting all the route sets.

## What it does

- **WhatsApp** (`/api/whatsapp/*`) - sends customer notifications over
  Meta's WhatsApp Cloud API. Holds a real access token that must never reach
  the browser, and Meta needs a public webhook here for delivery statuses
  and incoming replies.
- **Staff login admin** (`/api/users/*`) - lets owners/managers/super admins
  create staff logins, reset passwords, and assign branch/role, using the
  Firebase Admin SDK (also never safe in the browser).
- **App data** (`/api/data`, `/api/vision`, `/api/public`) - every business
  record (washes, payments, staff, services, inventory) in a real shared
  MySQL database, plus the "scan vehicle photo" vision endpoint and the
  public wash-tracking page.

The main app calls all three route groups directly; this server calls Meta,
Firebase, MySQL, and OpenAI in turn; Meta calls this server back on the
webhook with delivery status.

## Running it

```bash
cd whatsapp-server
npm install
npm run dev      # or: npm start
```

Runs on `http://localhost:4031` by default (see `.env` → `PORT`). The main
app's `.env` has `VITE_WHATSAPP_API_URL`, `VITE_USER_ADMIN_API_URL`, and
`VITE_APP_DATA_API_URL` all pointing at it now - keep those in sync if you
change the port. Both the Vite dev server and this one need to be running
for WhatsApp notifications, staff login admin, and app data to work.

## Modes (`WHATSAPP_ENV` in `.env`)

- **`mock`** (default, current setting) - no calls to Meta at all. A "send"
  is logged and immediately marked `sent` with a fake message id, so the
  full trigger → notification-record flow works right now with zero setup.
- **`live`** - real calls to the WhatsApp Cloud API (`graph.facebook.com`).
  Needs a Meta app with the WhatsApp product attached (see below).

## Getting real credentials

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
   and add the **WhatsApp** product to it.
2. Meta gives you a test phone number and a **temporary** access token
   (expires in 24h) to get started - fine for a first test, not for a
   running server. For anything longer-lived, generate a **permanent**
   System User access token (Business Settings → System Users) once you've
   attached a real WhatsApp Business Account and phone number.
3. Copy the Phone Number ID and WhatsApp Business Account ID from the app's
   WhatsApp → API Setup page into `.env`.
4. Pick any random string yourself for `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - you
   enter the same value in Meta's dashboard when configuring the webhook URL.

## The webhook

Meta calls `GET /api/whatsapp/webhook` once, to verify you own the URL
(must echo back `hub.challenge` when `hub.verify_token` matches), then
`POST`s to it going forward with delivery-status updates and incoming
customer messages. Like Safaricom's M-Pesa callback, this **must** be a
publicly reachable HTTPS URL - on localhost, tunnel it:

```bash
ngrok http 4031
# then set the webhook URL in Meta's dashboard to
# https://<your-ngrok-subdomain>.ngrok-free.app/api/whatsapp/webhook
```

## Message templates vs. free-form text

WhatsApp only allows free-form text replies within 24 hours of the customer
last messaging you (the "customer service window"). Everything this app
sends is business-initiated (payment confirmations, "your car is ready") -
outside that window, which is the normal case - so in **live** mode these
need to go out as a pre-approved **message template**, not plain text.
Create and get templates approved in Meta's WhatsApp Manager, then call
`/api/whatsapp/send` with `templateName` + `templateParams` instead of
`message`. Mock mode doesn't care either way.

## Endpoints

- `POST /api/whatsapp/send` - body `{ to, message }` for free-form text, or
  `{ to, templateName, templateParams }` for a template. Returns `{ id, status }`.
- `GET /api/whatsapp/status/:id` - status of one sent message.
- `GET /api/whatsapp/messages` - recent sends, for debugging.
- `GET`/`POST /api/whatsapp/webhook` - Meta calls this, not the frontend.
- `POST /api/users/*` - staff login create/reset/assign (see
  `src/userAdmin/routes/users.js`). Needs `Authorization: Bearer <idToken>`.
- `GET`/`POST`/`PUT`/`DELETE /api/data/*` - shared business records (see
  `src/appData/routes/data.js`). Needs `Authorization: Bearer <idToken>`.
- `POST /api/vision/*` - "scan vehicle photo" auto-fill.
- `GET /api/public/*` - public wash-tracking page, no auth (rate-limited per IP).
- `GET /health` - `{ ok, whatsappEnv, adminConfigured, dbConfigured }`.

## Notes / limitations

- WhatsApp messages are kept in memory (`src/messageStore.js`) - restarting
  this server drops that history. Swap for a real table if this needs to
  survive restarts reliably. App data (`/api/data`) is in real MySQL and
  survives restarts fine.
- No auth on `/api/whatsapp/*` yet - same caveat as `mpesa-server`: fine
  behind a private network / talking only to this one frontend, add an API
  key before exposing it publicly. `/api/users/*` and `/api/data/*` already
  require a valid Firebase sign-in token.
- Incoming customer replies are logged, not acted on - there's no reply/chat
  UI built on top of this yet.
- `user-admin-server/` and `app-data-server/` still exist in the repo as of
  this merge but are no longer deployed - kept only until the combined
  server here is verified working in production, then safe to delete.
