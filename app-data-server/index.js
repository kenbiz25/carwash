import express from "express";
import cors from "cors";
import { config, hasDbConfig } from "./src/config.js";
import { ensureSchema } from "./src/db.js";
import { ensureSeeded } from "./src/seed.js";
import dataRoutes from "./src/routes/data.js";
import visionRoutes from "./src/routes/vision.js";
import publicTrackRoutes from "./src/routes/publicTrack.js";

const app = express();

// Needed for req.ip to reflect the real visitor (not the reverse proxy) when
// deployed behind cPanel's Apache/Passenger - publicTrack.js's rate limiter
// is per-IP and would otherwise bucket every visitor together.
app.set("trust proxy", true);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "15mb" })); // photo uploads are base64 data URLs embedded in records

app.get("/health", (_req, res) => {
  res.json({ ok: true, dbConfigured: hasDbConfig });
});

app.use("/api/data", dataRoutes);
app.use("/api/vision", visionRoutes);
app.use("/api/public", publicTrackRoutes);

async function start() {
  if (hasDbConfig) {
    await ensureSchema();
    if (config.seedDemoData) await ensureSeeded();
  }
  app.listen(config.port, () => {
    console.log(`[app-data-server] listening on http://localhost:${config.port}`);
    if (!hasDbConfig) {
      console.log("[app-data-server] No database configured yet - see env.example.");
    }
  });
}

start().catch((err) => {
  console.error("[app-data-server] Failed to start:", err);
  process.exit(1);
});
