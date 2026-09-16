import { config } from "./config.js";

let cachedToken = null; // { token, expiresAt }

// OAuth token - Daraja tokens last ~1 hour; cache and reuse until near expiry.
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const res = await fetch(`${config.darajaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error(`Daraja OAuth failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

function darajaTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

// Accepts 07xxxxxxxx, 7xxxxxxxx, +2547xxxxxxxx, or 2547xxxxxxxx and normalizes
// to the 2547xxxxxxxx / 2541xxxxxxxx form Daraja requires.
export function normalizeMsisdn(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/**
 * Initiates a Lipa Na M-Pesa Online (STK Push) request.
 * Returns Safaricom's { MerchantRequestID, CheckoutRequestID, ResponseCode, ... }.
 */
export async function initiateStkPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString("base64");
  const msisdn = normalizeMsisdn(phone);

  const res = await fetch(`${config.darajaBaseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: Math.round(amount),
      PartyA: msisdn,
      PartyB: config.shortcode,
      PhoneNumber: msisdn,
      CallBackURL: config.callbackUrl,
      AccountReference: accountReference || "BGO Shine Hub",
      TransactionDesc: transactionDesc || "Car wash payment",
    }),
  });

  const data = await res.json();
  if (!res.ok || data.errorCode) {
    throw new Error(data.errorMessage || data.ResponseDescription || `Daraja STK push failed (${res.status})`);
  }
  return data;
}

/** Extracts the flat fields out of Safaricom's callback metadata array shape. */
export function parseCallbackMetadata(items = []) {
  const map = {};
  for (const item of items) {
    if (item?.Name) map[item.Name] = item.Value;
  }
  return {
    amount: map.Amount,
    mpesaReceipt: map.MpesaReceiptNumber,
    transactionDate: map.TransactionDate,
    phoneNumber: map.PhoneNumber,
  };
}
