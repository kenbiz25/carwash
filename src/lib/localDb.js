// Local, browser-only data store (IndexedDB) standing in for Firestore/Storage
// until a hosting decision is made. Firebase Auth is still used for identity;
// everything else — every app record and every uploaded file — lives here.
import seedData from "./local-seed-data.json";

const DB_NAME = "bgo_local_db";
const DB_VERSION = 1;

const STORES = [
  "businesses", "washes", "payments", "staff", "services", "inventory",
  "loyaltyCustomers", "schedules", "cctvFeeds", "jobOrders", "memberships",
  "customerSubscriptions", "businessSubscriptions", "notifications",
  "invitations", "users", "files",
];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// "raw" = no seed check, used only by ensureSeeded itself to avoid recursion.
async function rawGetAll(store) {
  const db = await openDb();
  return reqToPromise(tx(db, store, "readonly").getAll());
}

async function getAll(store) {
  await ensureSeeded();
  return rawGetAll(store);
}

async function get(store, id) {
  await ensureSeeded();
  const db = await openDb();
  return reqToPromise(tx(db, store, "readonly").get(id));
}

async function put(store, record) {
  await ensureSeeded();
  const db = await openDb();
  await reqToPromise(tx(db, store, "readwrite").put(record));
  notify(store);
  return record;
}

async function del(store, id) {
  await ensureSeeded();
  const db = await openDb();
  await reqToPromise(tx(db, store, "readwrite").delete(id));
  notify(store);
}

// ─── One-time seeding ───────────────────────────────────────────────────────
// Every public read/write above awaits this first, so no access path can run
// before the local store has been populated — whichever one happens to run first.

let seedPromise = null;
function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await rawGetAll("businesses");
      if (existing.length === 0) {
        const db = await openDb();
        for (const store of STORES) {
          const rows = seedData[store];
          if (!rows?.length) continue;
          const os = tx(db, store, "readwrite");
          for (const row of rows) os.put(row);
        }
      }
      // Runs every load — cheap no-op once already applied. Covers browsers that
      // seeded before a catalogue fix landed in local-seed-data.json.
      await migrateMergeVehicleTieredServices();
      await migrateOfficialPhoneNumber();
      await migrateBranchSlugsAndPhotos();
      await migratePricelistUpdate();
      await migrateAddPricingKind();
      await migrateGalleryStyles();
    })();
  }
  return seedPromise;
}

// Some catalogue services were originally seeded as two rows — "X (Saloon)" and
// "X (SUV)" — instead of one row carrying both price tiers. Folds any leftover
// pair into a single tiered service, keyed by name so it works regardless of id.
const VEHICLE_TIER_PAIRS = [
  "Basic Wash", "Flash Wash", "Vacuuming/Hoovering", "Under Wash Cleaning",
  "Roof Cleaning", "Interior Steam Wash", "Interior Deep Cleaning", "Waxing", "Buffing",
];
async function migrateMergeVehicleTieredServices() {
  const services = await rawGetAll("services");
  if (!services.length) return;
  const db = await openDb();
  const os = tx(db, "services", "readwrite");
  for (const base of VEHICLE_TIER_PAIRS) {
    const saloon = services.find((s) => s.name === `${base} (Saloon)`);
    const suv = services.find((s) => s.name === `${base} (SUV)`);
    if (!saloon || !suv) continue;
    os.put({ ...saloon, name: base, price_suv: suv.price_kes });
    os.delete(suv.id);
  }
}

// The official business number changed after go-live; fixes it on browsers
// that seeded before local-seed-data.json was updated.
const OLD_PHONE = "+254705091683";
const NEW_PHONE = "+254757234111";
async function migrateOfficialPhoneNumber() {
  const businesses = await rawGetAll("businesses");
  const stale = businesses.filter((b) => b.phone === OLD_PHONE);
  if (!stale.length) return;
  const db = await openDb();
  const os = tx(db, "businesses", "readwrite");
  for (const biz of stale) os.put({ ...biz, phone: NEW_PHONE });
}

// Backfills the `slug` (used for each branch's public page, e.g. /njiru) and a
// default `photos` gallery on businesses seeded before those fields existed.
const DEFAULT_BRANCH_PHOTOS = ["/img/main.jpeg", "/img/bay.jpg", "/img/detailing.jpg", "/img/detailing-2.jpg", "/img/main-wash.jpg", "/img/wash.jpg"];
function slugify(name) {
  return String(name || "").toLowerCase().replace(/^bgo shine hub\s*-?\s*/, "").trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
async function migrateBranchSlugsAndPhotos() {
  const businesses = await rawGetAll("businesses");
  const stale = businesses.filter((b) => !b.slug || !b.photos?.length);
  if (!stale.length) return;
  const db = await openDb();
  const os = tx(db, "businesses", "readwrite");
  for (const biz of stale) {
    os.put({
      ...biz,
      slug: biz.slug || slugify(biz.location || biz.name),
      photos: biz.photos?.length ? biz.photos : DEFAULT_BRANCH_PHOTOS,
    });
  }
}

// Reconciles two gaps against the owner's latest official pricelist:
// "Air-Fresheners" was seeded with only a flat price even though its own
// description always said "250 / 300 / 600 depending on scent/type", and
// "Carpet Cleaning (per square meter)" was missing from the catalogue
// entirely.
async function migratePricelistUpdate() {
  const services = await rawGetAll("services");
  if (!services.length) return;
  const db = await openDb();
  const os = tx(db, "services", "readwrite");

  const airFresheners = services.find((s) => s.name === "Air-Fresheners");
  if (airFresheners && (airFresheners.price_suv !== 300 || airFresheners.price_van !== 600)) {
    os.put({ ...airFresheners, price_suv: 300, price_van: 600 });
  }

  const hasCarpetCleaning = services.some((s) => s.name === "Carpet Cleaning (per square meter)");
  if (!hasCarpetCleaning) {
    const businessId = services[0]?.business_id;
    os.put({
      id: "carpetCleanSqm001",
      business_id: businessId,
      name: "Carpet Cleaning (per square meter)",
      category: "interior_clean",
      pricing_kind: "unit",
      price_kes: 200,
      price_suv: 250,
      requires_photo_proof: false,
      sort_order: services.length + 1,
      is_active: true,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    });
  }
}

// `pricing_kind` is presentation-only — it tells the catalogue UI what to
// call a service's price columns (Saloon/SUV/Van, a per-m² rate, a scent
// variant, or nothing beyond a single flat price). It never affects the
// actual numeric price_kes/price_suv/price_van fields or how DriveInWizard/
// EnhancedCheckIn pick a price — those still just read the numbers.
const PRICING_KIND_BY_NAME = {
  "Basic Wash": "vehicle", "Flash Wash": "vehicle", "Vacuuming/Hoovering": "vehicle",
  "Interior Steam Wash": "vehicle", "Under Wash Cleaning": "vehicle", "Roof Cleaning": "vehicle",
  "Interior Deep Cleaning": "vehicle", "Waxing": "vehicle", "Buffing": "vehicle",
  "Rim Restoration": "vehicle", "Tyre Shiner": "vehicle",
  "Carpet Cleaning (per square meter)": "unit",
  "Air-Fresheners": "variant",
};
function inferPricingKind(name) {
  return PRICING_KIND_BY_NAME[name] || "flat";
}
async function migrateAddPricingKind() {
  const services = await rawGetAll("services");
  const stale = services.filter((s) => !s.pricing_kind);
  if (!stale.length) return;
  const db = await openDb();
  const os = tx(db, "services", "readwrite");
  for (const svc of stale) {
    os.put({ ...svc, pricing_kind: inferPricingKind(svc.name) });
  }
}

// Each branch's public page picks its own photo-gallery presentation —
// backfills the three seeded branches for browsers that seeded before this
// field existed. New/unlisted branches fall back to "fan" in BranchPage.jsx.
const GALLERY_STYLE_BY_ID = { "qa-test-wash": "fan", "bgo-kayole": "spotlight", "bgo-utawala": "spotlight-wide" };
async function migrateGalleryStyles() {
  const businesses = await rawGetAll("businesses");
  const stale = businesses.filter((b) => GALLERY_STYLE_BY_ID[b.id] && b.gallery_style !== GALLERY_STYLE_BY_ID[b.id]);
  if (!stale.length) return;
  const db = await openDb();
  const os = tx(db, "businesses", "readwrite");
  for (const biz of stale) {
    os.put({ ...biz, gallery_style: GALLERY_STYLE_BY_ID[biz.id] });
  }
}

// ─── Querying (equality AND, array-contains, orderBy, limit) ────────────────
// Mirrors the shape firebaseClient.js's generic filter()/list() used against Firestore.

const ARRAY_CONTAINS = Symbol("array-contains");
export function arrayContains(value) {
  return { [ARRAY_CONTAINS]: value };
}

function matches(record, whereObj) {
  for (const [field, cond] of Object.entries(whereObj)) {
    if (cond && typeof cond === "object" && ARRAY_CONTAINS in cond) {
      if (!Array.isArray(record[field]) || !record[field].includes(cond[ARRAY_CONTAINS])) return false;
    } else if (record[field] !== cond) {
      return false;
    }
  }
  return true;
}

function applyOrderAndLimit(rows, orderByStr, limitNum) {
  let out = rows;
  if (orderByStr) {
    const desc = orderByStr.startsWith("-");
    const field = desc ? orderByStr.slice(1) : orderByStr;
    out = [...out].sort((a, b) => {
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
  }
  if (limitNum) out = out.slice(0, limitNum);
  return out;
}

async function queryStore(store, whereObj = {}, orderByStr = null, limitNum = null) {
  const all = await getAll(store);
  const filtered = all.filter((r) => matches(r, whereObj));
  return applyOrderAndLimit(filtered, orderByStr, limitNum);
}

// ─── Same-tab pub/sub (replaces onSnapshot) ─────────────────────────────────

const listeners = new Map(); // store -> Set<{whereObj, callback}>

function notify(store) {
  const subs = listeners.get(store);
  if (!subs) return;
  for (const { whereObj, callback } of subs) {
    getAll(store).then((all) => callback(all.filter((r) => matches(r, whereObj))));
  }
}

function subscribe(store, whereObj, callback) {
  if (!listeners.has(store)) listeners.set(store, new Set());
  const entry = { whereObj, callback };
  listeners.get(store).add(entry);
  // Fire once immediately with current data, like onSnapshot does.
  getAll(store).then((all) => callback(all.filter((r) => matches(r, whereObj))));
  return () => listeners.get(store)?.delete(entry);
}

// ─── File storage (replaces Firebase Storage) ───────────────────────────────
// Files are kept as base64 data URLs so they persist as plain strings on
// whatever record references them — no separate blob lookup needed.

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const localDb = {
  ensureSeeded,
  get,
  getAll,
  put,
  delete: del,
  query: queryStore,
  subscribe,
  fileToDataUrl,
  slugify,
  DEFAULT_BRANCH_PHOTOS,
};
