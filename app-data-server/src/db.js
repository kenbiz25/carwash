import mysql from "mysql2/promise";
import { config, hasDbConfig } from "./config.js";

// One generic table for every collection (businesses, washes, payments,
// staff, services, ...) - a "collection" discriminator column plus a JSON
// blob per row. This mirrors src/lib/localDb.js's IndexedDB stores exactly
// (each one already just holds loosely-shaped JS objects keyed by id), so
// no rigid per-entity schema is needed and adding a new collection later
// needs zero migration. Filtering/sorting/limiting happens in application
// code in routes/data.js, matching localDb.js's own query() semantics
// exactly - the safest way to guarantee identical behavior to what the
// frontend already relied on.
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS records (
    collection VARCHAR(64) NOT NULL,
    id VARCHAR(128) NOT NULL,
    business_id VARCHAR(128) NULL,
    created_date DATETIME(3) NULL,
    updated_date DATETIME(3) NULL,
    data JSON NOT NULL,
    PRIMARY KEY (collection, id),
    INDEX idx_collection_business (collection, business_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const pool = hasDbConfig
  ? mysql.createPool({ ...config.db, waitForConnections: true, connectionLimit: 10 })
  : null;

export async function ensureSchema() {
  if (!pool) return;
  await pool.query(CREATE_TABLE_SQL);
}
