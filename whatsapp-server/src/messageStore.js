// In-memory only - fine for a single dev/staging process. Restarting this
// server drops message history; a real deploy should swap this for a small
// database table, but the interface below is all the rest of the server
// touches, so that swap stays contained here.

const messages = new Map(); // id -> message record

export function recordMessage(id, data) {
  const record = {
    id,
    status: "sent", // "sent" | "delivered" | "read" | "failed"
    createdAt: new Date().toISOString(),
    ...data,
  };
  messages.set(id, record);
  return record;
}

export function getMessage(id) {
  return messages.get(id) || null;
}

export function updateMessageStatus(id, status, extra = {}) {
  const existing = messages.get(id);
  if (!existing) return null;
  const updated = { ...existing, status, updatedAt: new Date().toISOString(), ...extra };
  messages.set(id, updated);
  return updated;
}

export function listRecentMessages(limit = 50) {
  return [...messages.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}
