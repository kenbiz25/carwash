import { Router } from "express";
import { config } from "../config.js";
import { sendTextMessage, sendTemplateMessage } from "../metaClient.js";
import { recordMessage } from "../messageStore.js";

const router = Router();

function mockWamid() {
  return "wamid.MOCK" + Math.random().toString(36).slice(2, 12).toUpperCase();
}

// Body: either { to, message } for free-form text, or
// { to, templateName, templateParams: [...], templateLanguage } for a
// template send. templateLanguage defaults to "en" but must match whatever
// language a given template was actually approved under in WhatsApp Manager
// - Meta's own sample "hello_world" template specifically is "en_US", not
// "en", which otherwise surfaces as an opaque Graph API error.
router.post("/send", async (req, res) => {
  const { to, message, templateName, templateParams, templateLanguage, meta } = req.body || {};

  if (!to || (!message && !templateName)) {
    return res.status(400).json({ error: "to, and either message or templateName, are required" });
  }

  try {
    if (config.isMock) {
      const wamid = mockWamid();
      const record = recordMessage(wamid, {
        to, message, templateName, templateParams, meta: meta || {}, source: "mock",
      });
      console.log(`[whatsapp-server] (mock) to ${to}: ${message || `[template: ${templateName}]`}`);
      return res.json({ id: record.id, status: record.status });
    }

    const result = templateName
      ? await sendTemplateMessage({ to, templateName, languageCode: templateLanguage || undefined, params: templateParams || [] })
      : await sendTextMessage({ to, body: message });

    const record = recordMessage(result.wamid, {
      to, message, templateName, templateParams, meta: meta || {}, source: "meta",
    });
    res.json({ id: record.id, status: record.status });
  } catch (err) {
    console.error("[whatsapp-server] Send failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;
