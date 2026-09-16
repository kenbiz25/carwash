import express from "express";
import cors from "cors";
import { config } from "./src/config.js";
import stkpushRoutes from "./src/routes/stkpush.js";
import callbackRoutes from "./src/routes/callback.js";
import statusRoutes from "./src/routes/status.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, mpesaEnv: config.mpesaEnv });
});

app.use("/api/mpesa", stkpushRoutes);
app.use("/api/mpesa", callbackRoutes);
app.use("/api/mpesa", statusRoutes);

app.listen(config.port, () => {
  console.log(`[mpesa-server] listening on http://localhost:${config.port} (MPESA_ENV=${config.mpesaEnv})`);
  if (config.isMock) {
    console.log("[mpesa-server] Mock mode - STK pushes auto-complete after ~4s, no Safaricom calls are made.");
  }
});
