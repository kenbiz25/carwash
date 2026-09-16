import { config } from "./config.js";

// Accepts 07xxxxxxxx, 7xxxxxxxx, +2547xxxxxxxx, or 2547xxxxxxxx and normalizes
// to the 2547xxxxxxxx / 2541xxxxxxxx form the Cloud API requires (no "+").
export function normalizeMsisdn(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/**
 * Sends a free-form text message. Only deliverable if the customer messaged
 * this business's WhatsApp number in the last 24 hours (Meta's "customer
 * service window") — outside that window, Meta will reject it and you need
 * sendTemplateMessage instead.
 */
export async function sendTextMessage({ to, body }) {
  const res = await fetch(`${config.graphBaseUrl}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeMsisdn(to),
      type: "text",
      text: { body },
    }),
  });
  return handleResponse(res);
}

/**
 * Sends a pre-approved message template — the only way to reach a customer
 * proactively (payment confirmations, wash-ready alerts, etc.) outside the
 * 24-hour window, which is the normal case for this app's notifications.
 * The template itself (name, language, variable count) must already be
 * approved in Meta's WhatsApp Manager before this will work.
 */
export async function sendTemplateMessage({ to, templateName, languageCode = "en", params = [] }) {
  const res = await fetch(`${config.graphBaseUrl}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeMsisdn(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: params.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text) })) }]
          : undefined,
      },
    }),
  });
  return handleResponse(res);
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `WhatsApp Cloud API request failed (${res.status})`);
  }
  // Success shape: { messaging_product, contacts: [...], messages: [{ id }] }
  return { wamid: data?.messages?.[0]?.id, raw: data };
}
