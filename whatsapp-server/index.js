import express from "express";
import cors from "cors";
import { config } from "./src/config.js";
import sendRoutes from "./src/routes/send.js";
import webhookRoutes from "./src/routes/webhook.js";
import statusRoutes from "./src/routes/status.js";

import { hasServiceAccount } from "./src/userAdmin/config.js";
import usersRoutes from "./src/userAdmin/routes/users.js";

import { hasDbConfig, config as appDataConfig } from "./src/appData/config.js";
import { ensureSchema } from "./src/appData/db.js";
import { ensureSeeded } from "./src/appData/seed.js";
import dataRoutes from "./src/appData/routes/data.js";
import visionRoutes from "./src/appData/routes/vision.js";
import publicTrackRoutes from "./src/appData/routes/publicTrack.js";

// Combined server - formerly three separate cPanel Node.js Apps
// (whatsapp-server, user-admin-server, app-data-server), merged into one
// process to cut cPanel's per-account Passenger process count from 4 to 2
// (this + mpesa-server, kept separate since it handles time-sensitive
// Safaricom payment callbacks and shouldn't share fate with the others).
// Each half keeps its own route prefix exactly as before, so the frontend's
// three VITE_*_API_URL vars just need to point at the same host now.
const app = express();

// Needed for req.ip to reflect the real visitor (not the reverse proxy) when
// deployed behind cPanel's Apache/Passenger - publicTrack.js's rate limiter
// is per-IP and would otherwise bucket every visitor together.
app.set("trust proxy", true);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "15mb" })); // photo uploads are base64 data URLs embedded in records

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    whatsappEnv: config.whatsappEnv,
    adminConfigured: hasServiceAccount,
    dbConfigured: hasDbConfig,
  });
});

app.use("/api/whatsapp", sendRoutes);
app.use("/api/whatsapp", webhookRoutes);
app.use("/api/whatsapp", statusRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/vision", visionRoutes);
app.use("/api/public", publicTrackRoutes);

// Safety net so every route (including anything a future one forgets its
// own try/catch for) fails as JSON the frontend can parse and show, rather
// than Express's default HTML error page - src/lib/localDb.js's requestJson
// falls back to a useless generic message when the response body isn't
// valid JSON, which is exactly what made failed uploads look silent before
// this existed. Must be declared last, and after every app.use above -
// Express only treats a 4-arg function as error-handling middleware.
app.use((err, req, res, _next) => {
  console.error(`[combined-server] ${req.method} ${req.originalUrl} failed:`, err);
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: `Request body too large (limit ${err.limit} bytes) - likely too many/large photos in one save.` });
  }
  res.status(err?.status || err?.statusCode || 500).json({ error: err?.message || "Unexpected server error" });
});

async function start() {
  if (hasDbConfig) {
    await ensureSchema();
    if (appDataConfig.seedDemoData) await ensureSeeded();
  }
  app.listen(config.port, () => {
    console.log(`[combined-server] listening on http://localhost:${config.port} (WHATSAPP_ENV=${config.whatsappEnv})`);
    if (config.isMock) {
      console.log("[combined-server] WhatsApp mock mode - sends are logged and marked sent instantly, no Meta calls are made.");
    }
    if (!hasServiceAccount) {
      console.log("[combined-server] No Firebase service account yet - see env.example to enable create/reset/assign.");
    }
    if (!hasDbConfig) {
      console.log("[combined-server] No database configured yet - see env.example.");
    }
  });
}

start().catch((err) => {
  console.error("[combined-server] Failed to start:", err);
  process.exit(1);
});
