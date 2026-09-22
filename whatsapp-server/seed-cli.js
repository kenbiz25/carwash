// Manual, one-off way to load the demo dataset (Njiru/Kayole/Utawala and
// their washes/services/staff) into this database - useful for a QA/staging
// database, but never runs automatically. Production start-up only seeds
// when SEED_DEMO_DATA=true is explicitly set in .env (see env.example).
import { ensureSchema } from "./src/appData/db.js";
import { ensureSeeded } from "./src/appData/seed.js";
import { hasDbConfig } from "./src/appData/config.js";

if (!hasDbConfig) {
  console.error("[app-data-server] No database configured - fill in .env first. See env.example.");
  process.exit(1);
}

await ensureSchema();
await ensureSeeded();
console.log("[app-data-server] Done. (No-op if the businesses collection already had rows.)");
process.exit(0);
