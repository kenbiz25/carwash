import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedData = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "seed-data.json"), "utf8"));

// Only called when SEED_DEMO_DATA=true (see index.js/seed-cli.js) - loads
// the demo Njiru/Kayole/Utawala dataset once, mirroring what
// src/lib/localDb.js's ensureSeeded() used to do per-browser. A brand new
// database needs no data migrations (those existed only to fix
// already-seeded browsers whose data had drifted from what this seed file
// already looks like) - this file is already the current, correct shape,
// so a straight bulk insert is enough. Still a no-op if the businesses
// collection already has any rows, however it got called.
export async function ensureSeeded() {
  if (!pool) return;
  const [[{ count }]] = await pool.query(
    "SELECT COUNT(*) as count FROM records WHERE collection = 'businesses'"
  );
  if (count > 0) return;

  console.log("[app-data-server] Empty database detected - seeding demo data...");
  for (const [collection, records] of Object.entries(seedData)) {
    for (const record of records) {
      await pool.query(
        "INSERT INTO records (collection, id, business_id, created_date, updated_date, data) VALUES (?, ?, ?, ?, ?, ?)",
        [
          collection,
          record.id,
          record.business_id || null,
          record.created_date || null,
          record.updated_date || null,
          JSON.stringify(record),
        ]
      );
    }
  }
  console.log("[app-data-server] Seeding complete.");
}
