// Talks to the standalone mpesa-server backend (see mpesa-server/README.md).
// That server is what actually calls Safaricom - the browser never sees the
// consumer key/secret or passkey.

const BASE_URL = import.meta.env.VITE_MPESA_API_URL || "http://localhost:4021";

async function requestJson(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `mpesa-server request failed (${res.status})`);
  }
  return data;
}

/** Kicks off an STK push. Resolves with { checkoutRequestId, customerMessage }. */
export function initiateStkPush({ phone, amount, accountReference, transactionDesc, meta }) {
  return requestJson("/api/mpesa/stkpush", {
    method: "POST",
    body: JSON.stringify({ phone, amount, accountReference, transactionDesc, meta }),
  });
}

/** One status check. Status is "pending" | "completed" | "failed". */
export function getStkPushStatus(checkoutRequestId) {
  return requestJson(`/api/mpesa/status/${encodeURIComponent(checkoutRequestId)}`);
}

/**
 * Polls until the push resolves (completed/failed) or timeoutMs elapses.
 * Resolves with the final transaction record; throws on timeout.
 */
export async function waitForStkPushResult(checkoutRequestId, { intervalMs = 2000, timeoutMs = 60000 } = {}) {
  const start = Date.now();
  for (;;) {
    const txn = await getStkPushStatus(checkoutRequestId);
    if (txn.status === "completed" || txn.status === "failed") return txn;
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for the customer to complete the M-Pesa prompt");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
