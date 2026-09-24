import express from "express";
import { pool } from "../db.js";
import { hasDbConfig } from "../config.js";
import { requireAuth } from "../authMiddleware.js";

const router = express.Router();

// Every route requires a signed-in Firebase user, with one deliberate
// exception: reading "invitations" has to work for someone who has an
// invite link but hasn't signed in yet (src/pages/JoinBusiness.jsx looks up
// the token before any auth exists) - the token itself is what gates access
// to that one record, the same trust model this app already had when
// invitations lived in browser-local IndexedDB.
router.use("/:collection", (req, res, next) => {
  if (req.method === "GET" && req.params.collection === "invitations") return next();
  return requireAuth(req, res, next);
});

function requireDb(res) {
  if (!hasDbConfig) {
    res.status(501).json({ error: "Database not configured yet on this server - see app-data-server/env.example." });
    return false;
  }
  return true;
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function rowToRecord(row) {
  // The JSON column already carries every field (including id/business_id/
  // created_date/updated_date) - the separate columns exist only for
  // indexing, so the row's own `data` is the single source of truth.
  return typeof row.data === "string" ? JSON.parse(row.data) : row.data;
}

// GET /api/data/:collection/:id - single record, or null.
router.get("/:collection/:id", async (req, res, next) => {
  if (!requireDb(res)) return;
  try {
    const [rows] = await pool.query(
      "SELECT data FROM records WHERE collection = ? AND id = ?",
      [req.params.collection, req.params.id]
    );
    res.json(rows[0] ? rowToRecord(rows[0]) : null);
  } catch (err) {
    next(err);
  }
});

// GET /api/data/:collection - all records, or filtered/sorted/limited via
// ?where=<json>&orderBy=<field or -field>&limit=<n>. Filtering happens here
// in JS (mirroring the exact equality-match semantics the frontend already
// relied on from src/lib/localDb.js) rather than as generated SQL, so
// behavior can never drift from what every page already expects.
router.get("/:collection", async (req, res, next) => {
  if (!requireDb(res)) return;
  try {
    const [rows] = await pool.query(
      "SELECT data FROM records WHERE collection = ?",
      [req.params.collection]
    );
    let records = rows.map(rowToRecord);

    if (req.query.where) {
      let whereObj;
      try {
        whereObj = JSON.parse(req.query.where);
      } catch {
        return res.status(400).json({ error: "where must be valid JSON" });
      }
      records = records.filter((r) =>
        Object.entries(whereObj).every(([field, value]) => r[field] === value)
      );
    }

    if (req.query.orderBy) {
      const desc = req.query.orderBy.startsWith("-");
      const field = desc ? req.query.orderBy.slice(1) : req.query.orderBy;
      records = [...records].sort((a, b) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
    }

    if (req.query.limit) {
      records = records.slice(0, Number(req.query.limit));
    }

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// PUT /api/data/:collection/:id - upsert the full record (body is the
// complete, already-merged object - the frontend does the merging, same as
// it always did against localDb.put).
router.put("/:collection/:id", async (req, res, next) => {
  if (!requireDb(res)) return;
  const record = { ...req.body, id: req.params.id };
  try {
    await pool.query(
      `INSERT INTO records (collection, id, business_id, created_date, updated_date, data)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         business_id = VALUES(business_id),
         created_date = VALUES(created_date),
         updated_date = VALUES(updated_date),
         data = VALUES(data)`,
      [
        req.params.collection,
        record.id,
        record.business_id || null,
        toDate(record.created_date),
        toDate(record.updated_date),
        JSON.stringify(record),
      ]
    );
    res.json(record);
  } catch (err) {
    // Most common real-world cause here is a record that's grown too big for
    // MySQL's max_allowed_packet (e.g. a wash/business record carrying
    // several base64-encoded photos) - surface that distinctly instead of a
    // generic 500, since the fix (compress/limit photos, or raise
    // max_allowed_packet) is different from any other kind of DB error.
    if (err?.code === "ER_NET_PACKET_TOO_LARGE" || /max_allowed_packet/i.test(err?.message || "")) {
      res.status(413).json({ error: "This record is too large to save (likely a photo) - it exceeds the database's max_allowed_packet limit." });
      return;
    }
    next(err);
  }
});

// DELETE /api/data/:collection/:id
router.delete("/:collection/:id", async (req, res, next) => {
  if (!requireDb(res)) return;
  try {
    await pool.query("DELETE FROM records WHERE collection = ? AND id = ?", [req.params.collection, req.params.id]);
    res.json({ id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
