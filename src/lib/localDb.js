// Talks to the app-data-server backend (see app-data-server/README.md),
// which stores every business record in a real MySQL database on the
// server - replacing the browser-only IndexedDB store this used to be, so
// every device now sees the same data instead of each browser holding its
// own private copy.
//
// The exported shape (get/getAll/put/delete/query/subscribe/ensureSeeded)
// is kept identical to the old IndexedDB implementation on purpose: every
// caller across the app (AuthContext, BusinessContext, Login/JoinBusiness,
// firebaseClient.js's entity methods, ...) uses `localDb` directly and none
// of them needed to change.
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.VITE_APP_DATA_API_URL || "http://localhost:4051";

async function authHeaders() {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(await authHeaders()), ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Couldn't reach the data server at ${BASE_URL} - make sure app-data-server is running, then try again.`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `app-data-server request failed (${res.status})`);
  return data;
}

// Seeding now happens once, server-side, the first time the database is
// empty (see app-data-server/src/seed.js) - nothing left for the browser to do.
async function ensureSeeded() {}

async function get(store, id) {
  return requestJson(`/api/data/${store}/${encodeURIComponent(id)}`);
}

async function getAll(store) {
  return requestJson(`/api/data/${store}`);
}

async function put(store, record) {
  await requestJson(`/api/data/${store}/${encodeURIComponent(record.id)}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
  return record;
}

async function del(store, id) {
  await requestJson(`/api/data/${store}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function queryStore(store, whereObj = {}, orderByStr = null, limitNum = null) {
  const params = new URLSearchParams();
  if (whereObj && Object.keys(whereObj).length) params.set("where", JSON.stringify(whereObj));
  if (orderByStr) params.set("orderBy", orderByStr);
  if (limitNum) params.set("limit", String(limitNum));
  const qs = params.toString();
  return requestJson(`/api/data/${store}${qs ? `?${qs}` : ""}`);
}

// ─── Cross-device "realtime" (replaces same-tab pub/sub) ────────────────────
// There's no push channel from the server, so this polls instead - good
// enough for a car wash's pace of updates, and it's the same interval
// pattern already used for the notification bell in TopBar.jsx.
const POLL_INTERVAL_MS = 15000;

function subscribe(store, whereObj, callback) {
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    queryStore(store, whereObj).then((rows) => !cancelled && callback(rows)).catch(() => {});
  };
  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => { cancelled = true; clearInterval(interval); };
}

// ─── File storage (unchanged) ───────────────────────────────────────────────
// Files are still kept as base64 data URLs embedded directly on whatever
// record references them - simplest thing that works, unrelated to where
// the records themselves are stored.

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DEFAULT_BRANCH_PHOTOS = ["/img/main.jpeg", "/img/bay.jpg", "/img/detailing.jpg", "/img/detailing-2.jpg", "/img/main-wash.jpg", "/img/wash.jpg"];
function slugify(name) {
  return String(name || "").toLowerCase().replace(/^bgo shine hub\s*-?\s*/, "").trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
