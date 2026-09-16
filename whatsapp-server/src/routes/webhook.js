import { Router } from "express";
import { config } from "../config.js";
import { updateMessageStatus } from "../messageStore.js";

const router = Router();

// Meta's one-time verification handshake when you set the webhook URL in
// the App Dashboard - must echo back hub.challenge if the verify token matches.
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Meta calls this for both delivery-status updates (sent/delivered/read/failed)
// and incoming customer replies. Must always respond 200 quickly, or Meta
// will retry and eventually disable the webhook.
router.post("/webhook", (req, res) => {
  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        for (const status of value.statuses || []) {
          updateMessageStatus(status.id, status.status, {
            recipientId: status.recipient_id,
            errorMessage: status.errors?.[0]?.title,
          });
          console.log(`[whatsapp-server] status update: ${status.id} -> ${status.status}`);
        }

        for (const msg of value.messages || []) {
          // Incoming customer message - no reply flow built yet, just logged
          // so nothing silently disappears once a customer starts replying.
          console.log(`[whatsapp-server] incoming message from ${msg.from}: ${msg.text?.body || `[${msg.type}]`}`);
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp-server] Error handling webhook payload:", err.message);
  }
  res.sendStatus(200);
});

export default router;
