import express from "express";
import { requireAuth } from "../authMiddleware.js";
import { config, hasOpenAiKey } from "../config.js";

const router = express.Router();
router.use(requireAuth);

const VEHICLE_TYPES = ["saloon", "suv", "van", "pickup", "motorcycle", "truck", "bus", "other"];

const PROMPT = `You are helping a Kenyan car wash's front-desk staff check in a vehicle.
Look at the photo and extract these fields as JSON, with exactly these five keys:
- plate_number: the number plate, uppercase, formatted like "KAA 123B" (empty string if not clearly visible)
- vehicle_type: exactly one of ${VEHICLE_TYPES.join(", ")} (best guess from body shape)
- vehicle_make: your best guess at the manufacturer from the body shape, badge, or styling, e.g.
  "Toyota" - only leave this empty if the vehicle isn't visible at all
- vehicle_model: your best guess at the specific model, e.g. "Corolla" - a reasonable guess is far
  more useful to front-desk staff than a blank field they have to type themselves; only leave this
  empty if you truly can't narrow it down at all
- vehicle_color: a plain color name, e.g. "White" (empty string if unsure)
The plate number is the one field that must never be guessed - it's used for billing, so leave it
empty rather than risk a wrong character. Every other field should favor a confident best guess over
leaving it blank. Respond with ONLY the JSON object, no other text.`;

// POST /api/vision/scan-vehicle - body { image: "data:image/...;base64,..." }.
// Staff snap one photo of the vehicle on the Details tab instead of typing
// plate/make/model/color by hand; that same photo also satisfies the
// "before" photo requirement on the Photos tab, so nothing is captured twice.
router.post("/scan-vehicle", async (req, res) => {
  if (!hasOpenAiKey) {
    return res.status(501).json({ error: "Vehicle photo scanning isn't configured yet - see app-data-server/env.example (OPENAI_API_KEY)." });
  }
  const { image } = req.body || {};
  if (!image || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "image must be a data:image/... base64 URL" });
  }

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiVisionModel,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      return res.status(502).json({ error: `OpenAI request failed (${aiRes.status}): ${detail.slice(0, 300)}` });
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let fields;
    try {
      fields = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Couldn't parse the AI's response - try again or fill the form manually." });
    }

    res.json({
      plate_number: typeof fields.plate_number === "string" ? fields.plate_number.toUpperCase().trim() : "",
      vehicle_type: VEHICLE_TYPES.includes(fields.vehicle_type) ? fields.vehicle_type : "",
      vehicle_make: typeof fields.vehicle_make === "string" ? fields.vehicle_make.trim() : "",
      vehicle_model: typeof fields.vehicle_model === "string" ? fields.vehicle_model.trim() : "",
      vehicle_color: typeof fields.vehicle_color === "string" ? fields.vehicle_color.trim() : "",
    });
  } catch (err) {
    res.status(502).json({ error: "Couldn't reach the vision service: " + err.message });
  }
});

export default router;
