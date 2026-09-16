// In-memory only - fine for a single dev/staging process. Restarting this
// server drops any pending (not yet completed) transactions; a real deploy
// should swap this for a small database table, but the interface below is
// all the rest of the server touches, so that swap stays contained here.

const transactions = new Map(); // checkoutRequestId -> transaction record

export function createTransaction(checkoutRequestId, data) {
  const record = {
    checkoutRequestId,
    status: "pending", // "pending" | "completed" | "failed"
    createdAt: new Date().toISOString(),
    ...data,
  };
  transactions.set(checkoutRequestId, record);
  return record;
}

export function getTransaction(checkoutRequestId) {
  return transactions.get(checkoutRequestId) || null;
}

export function completeTransaction(checkoutRequestId, result) {
  const existing = transactions.get(checkoutRequestId);
  if (!existing) return null;
  const updated = { ...existing, status: "completed", completedAt: new Date().toISOString(), ...result };
  transactions.set(checkoutRequestId, updated);
  return updated;
}

export function failTransaction(checkoutRequestId, reason) {
  const existing = transactions.get(checkoutRequestId);
  if (!existing) return null;
  const updated = { ...existing, status: "failed", completedAt: new Date().toISOString(), failureReason: reason };
  transactions.set(checkoutRequestId, updated);
  return updated;
}
