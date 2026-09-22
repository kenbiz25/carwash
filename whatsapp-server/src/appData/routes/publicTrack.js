import express from "express";
import { pool } from "../db.js";
import { hasDbConfig } from "../config.js";

const router = express.Router();

// Deliberately public - a customer never signs in anywhere in this app, so
// this is the one read that has to work without a Firebase token. The
// trade-off is scoped tightly: both phone AND plate must match exactly (the
// same "order number + something only the owner would know" pattern most
// package-tracking pages use), only a handful of non-sensitive fields come
// back, and requests are rate-limited per IP below.

// Kenyan MSISDN normalization, matching user-admin-server's copy - so
// "0757234111" and "+254757234111" hit the same record.
function normalizePhoneKe(input) {
  let digits = String(input || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.length === 9) digits = "254" + digits;
  return digits;
}

function normalizePlate(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Simple in-memory sliding-window limiter - no extra dependency, resets on
// restart, good enough to deter casual scraping of plate/phone combos at the
// scale of a 3-branch car wash. Not meant to survive a determined attacker.
const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000;
const hits = new Map(); // ip -> [timestamps]
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

router.get("/track-car", async (req, res) => {
  if (!hasDbConfig) {
    return res.status(501).json({ error: "Database not configured yet on this server." });
  }
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: "Too many attempts - please wait a minute and try again." });
  }

  const { phone, plate } = req.query;
  if (!phone || !plate) {
    return res.status(400).json({ error: "Both phone and plate are required." });
  }
  const normPhone = normalizePhoneKe(phone);
  const normPlate = normalizePlate(plate);
  if (normPhone.length < 12 || normPlate.length < 4) {
    return res.status(400).json({ error: "Enter a valid phone number and plate number." });
  }

  const [rows] = await pool.query("SELECT data FROM records WHERE collection = 'washes'");
  const allWashes = rows.map((r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data));

  // The plate proves this phone's history is actually theirs to see - a real
  // plate+phone pair only exists together if a car under that phone was
  // genuinely serviced, so this is the "password" that unlocks the phone's
  // full history below (every vehicle checked in under that number, not
  // just the one plate that was searched for).
  const verifyingMatch = allWashes.some(
    (w) => normalizePhoneKe(w.customer_phone) === normPhone && normalizePlate(w.plate_number) === normPlate
  );
  if (!verifyingMatch) {
    return res.status(404).json({ error: "No matching entry found for that phone number and plate number." });
  }

  const phoneWashes = allWashes
    .filter((w) => normalizePhoneKe(w.customer_phone) === normPhone)
    .sort((a, b) => new Date(b.entry_time || b.created_date || 0) - new Date(a.entry_time || a.created_date || 0))
    .slice(0, 50);

  const businessIds = [...new Set(phoneWashes.map((w) => w.business_id).filter(Boolean))];
  const businessNames = {};
  if (businessIds.length > 0) {
    const placeholders = businessIds.map(() => "?").join(",");
    const [bizRows] = await pool.query(
      `SELECT data FROM records WHERE collection = 'businesses' AND id IN (${placeholders})`,
      businessIds
    );
    for (const row of bizRows) {
      const biz = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      if (biz?.id) businessNames[biz.id] = biz.name;
    }
  }

  const toPublicWash = (w) => ({
    plate_number: w.plate_number,
    vehicle_type: w.vehicle_type || null,
    status: w.status,
    entry_time: w.entry_time || w.created_date || null,
    exit_time: w.exit_time || null,
    bay_number: w.bay_number || null,
    services: (w.services || []).map((s) => ({ name: s.name, price: s.price })),
    amount_due: w.amount_due || 0,
    amount_paid: w.amount_paid || 0,
    payment_method: w.payment_method || null,
    business_name: businessNames[w.business_id] || null,
  });

  res.json({
    verified: true,
    history: phoneWashes.map(toPublicWash),
  });
});

export default router;
