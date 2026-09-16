# BGO WhatsApp Server

A small standalone backend that sends customer notifications over WhatsApp
via Meta's WhatsApp Cloud API - separate from the main app because it holds
a real access token that must never reach the browser, and because Meta
needs a public webhook to call with delivery statuses and incoming replies.

The main app (`NotificationService.jsx`, via `src/lib/whatsappClient.js`)
calls this server; this server calls Meta; Meta calls this server back on
the webhook with delivery status.

## Running it

```bash
cd whatsapp-server
npm install
npm run dev      # or: npm start
```

Runs on `http://localhost:4031` by default (see `.env` → `PORT`). The main
app's `.env` has `VITE_WHATSAPP_API_URL` pointing at it - keep those in sync
if you change the port. Both the Vite dev server and this one need to be
running for WhatsApp notifications to actually send.

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
- `GET /health` - `{ ok: true, whatsappEnv }`.

## Notes / limitations

- Messages are kept in memory (`src/messageStore.js`) - restarting this
  server drops history. Swap for a real table if this needs to survive
  restarts reliably.
- No auth on these endpoints yet - same caveat as `mpesa-server`: fine
  behind a private network / talking only to this one frontend, add an API
  key before exposing it publicly.
- Incoming customer replies are logged, not acted on - there's no reply/chat
  UI built on top of this yet.
