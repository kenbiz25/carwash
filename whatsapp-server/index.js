import express from "express";
import cors from "cors";
import { config } from "./src/config.js";
import sendRoutes from "./src/routes/send.js";
import webhookRoutes from "./src/routes/webhook.js";
import statusRoutes from "./src/routes/status.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, whatsappEnv: config.whatsappEnv });
});

app.use("/api/whatsapp", sendRoutes);
app.use("/api/whatsapp", webhookRoutes);
app.use("/api/whatsapp", statusRoutes);

app.listen(config.port, () => {
  console.log(`[whatsapp-server] listening on http://localhost:${config.port} (WHATSAPP_ENV=${config.whatsappEnv})`);
  if (config.isMock) {
    console.log("[whatsapp-server] Mock mode - sends are logged and marked sent instantly, no Meta calls are made.");
  }
});
