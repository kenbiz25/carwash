// Talks to the standalone whatsapp-server backend (see whatsapp-server/README.md).
// That server is what actually calls Meta's WhatsApp Cloud API — the browser
// never sees the access token.

const BASE_URL = import.meta.env.VITE_WHATSAPP_API_URL || "http://localhost:4031";

async function requestJson(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `whatsapp-server request failed (${res.status})`);
  }
  return data;
}

/** Sends a free-form text message. Resolves with { id, status }. */
export function sendWhatsappText({ to, message, meta }) {
  return requestJson("/api/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ to, message, meta }),
  });
}

/** Sends a pre-approved message template. Resolves with { id, status }. */
export function sendWhatsappTemplate({ to, templateName, templateParams, meta }) {
  return requestJson("/api/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ to, templateName, templateParams, meta }),
  });
}
