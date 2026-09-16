# BGO M-Pesa Server

A small standalone backend that handles Safaricom Daraja STK Push (Lipa Na
M-Pesa Online) - separate from the main app because it holds real secrets
(consumer key/secret, passkey) that must never reach the browser, and because
Safaricom needs a public server to call back to when a payment completes.

The main app (`PaymentDialog.jsx`, via `src/lib/mpesaClient.js`) calls this
server; this server calls Safaricom; Safaricom calls this server back; the
main app polls this server for the result and then writes the confirmed
payment into its own data store, which is what makes it show up on the
dashboard immediately.

## Running it

```bash
cd mpesa-server
npm install
npm run dev      # or: npm start
```

Runs on `http://localhost:4021` by default (see `.env` → `PORT`). The main
app's `.env` has `VITE_MPESA_API_URL` pointing at it - keep those in sync if
you change the port. Both the Vite dev server and this one need to be
running for payments to work.

## Modes (`MPESA_ENV` in `.env`)

- **`mock`** (default, current setting) - no calls to Safaricom at all. An
  STK push request gets a fake `CheckoutRequestID` back immediately and
  automatically "completes" ~4 seconds later with a made-up receipt, so the
  full trigger → dashboard-update flow works right now with zero setup.
  Good for demos and for building/testing the rest of the app while waiting
  on real credentials.
- **`sandbox`** - real calls to Safaricom's sandbox
  (`https://sandbox.safaricom.co.ke`). Needs a Daraja app (see below).
- **`production`** - real calls to Safaricom's live API
  (`https://api.safaricom.co.ke`). Needs your own Paybill/Till shortcode and
  passkey, not the shared sandbox ones.

## Getting real credentials

1. Create an account and an app at
   [developer.safaricom.co.ke](https://developer.safaricom.co.ke).
2. Subscribe the app to **Lipa Na M-Pesa Online**. This gives you a
   Consumer Key and Consumer Secret.
3. For sandbox testing, Safaricom publishes a shared test shortcode
   (`174379`) and passkey on the same portal - already set as the default
   `MPESA_SHORTCODE` in `env.example`; you still need to copy the published
   passkey into `MPESA_PASSKEY`.
4. For production, apply for your own Paybill/Till number through Safaricom
   directly - that comes with its own shortcode and passkey.
5. Put all of it in `.env` (copy `env.example` if you don't have one yet)
   and set `MPESA_ENV=sandbox` (or `production`).

## The callback URL

Safaricom POSTs the payment result to `MPESA_CALLBACK_URL` - this **must**
be a publicly reachable HTTPS URL; Safaricom cannot reach `localhost`.
For local development, tunnel this server and point the env var at the
tunnel:

```bash
ngrok http 4021
# then set MPESA_CALLBACK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/mpesa/callback
```

For a real deployment, this is just wherever `mpesa-server` ends up hosted,
e.g. `https://api.bgoshinehub.com/api/mpesa/callback`.

## Endpoints

- `POST /api/mpesa/stkpush` - body `{ phone, amount, accountReference?, transactionDesc? }`,
  returns `{ checkoutRequestId, merchantRequestId, customerMessage }`.
- `GET /api/mpesa/status/:checkoutRequestId` - returns the transaction record
  (`status: "pending" | "completed" | "failed"`, plus `mpesaReceipt`/`amount`/
  `phoneNumber` once completed). The frontend polls this every 2s.
- `POST /api/mpesa/callback` - Safaricom calls this, not the frontend.
- `GET /health` - `{ ok: true, mpesaEnv }`.

## Notes / limitations

- Transactions are kept in memory (`src/transactionStore.js`) - restarting
  this server drops anything still pending. Fine for now; swap that file
  for a real table if this needs to survive restarts reliably.
- There's no auth on these endpoints yet - anyone who can reach this server
  can trigger an STK push or read a transaction's status by id. Acceptable
  behind a private network / while it only talks to the one frontend, but
  add an API key or similar before exposing it publicly.
