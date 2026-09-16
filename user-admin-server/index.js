import express from "express";
import cors from "cors";
import { config, hasServiceAccount } from "./src/config.js";
import usersRoutes from "./src/routes/users.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, adminConfigured: hasServiceAccount });
});

app.use("/api/users", usersRoutes);

app.listen(config.port, () => {
  console.log(`[user-admin-server] listening on http://localhost:${config.port}`);
  if (!hasServiceAccount) {
    console.log("[user-admin-server] No service account yet - see env.example to enable create/reset/assign.");
  }
});
