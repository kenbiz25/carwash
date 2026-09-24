import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { localDb } from '@/lib/localDb';

// Entity name → local store name (was: Firestore collection name)
const COLLECTION_MAP = {
  Business: 'businesses',
  Wash: 'washes',
  Payment: 'payments',
  Staff: 'staff',
  Service: 'services',
  Inventory: 'inventory',
  InventoryCount: 'inventoryCounts',
  LoyaltyCustomer: 'loyaltyCustomers',
  Schedule: 'schedules',
  CCTVFeed: 'cctvFeeds',
  Membership: 'memberships',
  CustomerSubscription: 'customerSubscriptions',
  Notification: 'notifications',
  Invitation: 'invitations',
  Expense: 'expenses',
};

// Firestore rejected undefined values - keep the same normalization so
// existing data written under Firestore behaves identically here.
function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

function newId() {
  return crypto.randomUUID();
}

function entityMethods(store) {
  return {
    async filter(whereObj = {}, orderByStr = null, limitNum = null) {
      // Single id lookup - mirrors the old direct getDoc shortcut.
      if (whereObj.id && Object.keys(whereObj).length === 1) {
        const record = await localDb.get(store, whereObj.id);
        return record ? [record] : [];
      }
      return localDb.query(store, whereObj, orderByStr, limitNum);
    },

    async create(data) {
      const record = stripUndefined({
        id: newId(),
        ...data,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
      await localDb.put(store, record);
      return record;
    },

    async update(id, data) {
      const existing = (await localDb.get(store, id)) || { id };
      const record = stripUndefined({
        ...existing,
        ...data,
        id,
        updated_date: new Date().toISOString(),
      });
      await localDb.put(store, record);
      return record;
    },

    async delete(id) {
      await localDb.delete(store, id);
      return { id };
    },

    async list(orderByStr = null, limitNum = null) {
      return localDb.query(store, {}, orderByStr, limitNum);
    },

    subscribe(callback, whereObj = {}) {
      return localDb.subscribe(store, whereObj, callback);
    },
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Firebase Auth stays as the identity provider; the profile record itself
// (full_name, role, etc.) now lives in the local `users` store, keyed by the
// same uid Firebase Auth already assigns.

const authModule = {
  async me() {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');

    // Accounts created by a manager/owner/super admin (or assigned branch +
    // role by a super admin after a first Google sign-in) carry that as a
    // Firebase custom claim - set server-side by user-admin-server, and
    // readable on any device the moment this account gets a fresh token.
    // That makes it the source of truth over the local `users` profile
    // below, which is per-browser and only ever reflects this one device.
    let claims = {};
    try {
      claims = (await currentUser.getIdTokenResult()).claims || {};
    } catch { /* best effort - fall back to local profile only */ }

    const existing = await localDb.get('users', currentUser.uid);
    if (!existing) {
      const profile = {
        id: currentUser.uid,
        uid: currentUser.uid,
        email: currentUser.email,
        full_name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
        avatar_url: currentUser.photoURL || '',
        role: claims.role || 'user',
        ...(claims.business_id ? { business_id: claims.business_id } : {}),
        ...(claims.username ? { username: claims.username } : {}),
        created_date: new Date().toISOString(),
      };
      await localDb.put('users', profile);
      return profile;
    }

    // Always merge email/displayName from Firebase Auth so pages never see undefined
    return {
      email: currentUser.email,
      full_name: currentUser.displayName || '',
      avatar_url: currentUser.photoURL || '',
      ...existing,
      ...(claims.role ? { role: claims.role } : {}),
      ...(claims.business_id ? { business_id: claims.business_id } : {}),
      ...(claims.username ? { username: claims.username } : {}),
    };
  },

  async updateMe(data) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const existing = (await localDb.get('users', currentUser.uid)) || { id: currentUser.uid };
    const record = { ...existing, ...data, id: currentUser.uid, updated_date: new Date().toISOString() };
    await localDb.put('users', record);
    return record;
  },

  async logout() {
    await signOut(auth);
    window.location.href = '/Login';
  },

  redirectToLogin(returnUrl = null) {
    const path = returnUrl ? `/Login?returnUrl=${encodeURIComponent(returnUrl)}` : '/Login';
    window.location.href = path;
  },

  isAuthenticated() {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(!!user); });
    });
  },
};

// ─── File storage ─────────────────────────────────────────────────────────────
// Replaces Firebase Storage - files are kept as base64 data URLs in the local
// `files` store, so the returned URL is a plain string usable directly as an
// <img src> or link, same as a Storage download URL was.

// A raw phone-camera photo (often 3-8MB) sent as-is would base64-inflate by
// ~33% and, for a wash's photos_before/photos_proof arrays specifically, get
// re-sent in full on every subsequent save of that record (each PUT is a
// full-record upsert, not a delta) - easily exceeding either the server's
// request-body limit or MySQL's max_allowed_packet. Downscaling + re-encoding
// as JPEG client-side keeps every photo well under those limits without
// visibly hurting quality for what these are used for (proof-of-condition
// photos, not print-quality images).
const MAX_IMAGE_DIMENSION = 1600; // px, longest side
const IMAGE_QUALITY = 0.75;

function compressImage(file, maxDimension = MAX_IMAGE_DIMENSION, quality = IMAGE_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image for compression'));
    };
    img.src = objectUrl;
  });
}

const integrationsModule = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('No file provided');
      // Some formats a browser's <img>/canvas can't decode at all (e.g. an
      // iPhone's HEIC before iOS's own "Most Compatible" JPEG setting) -
      // fall back to the original, uncompressed file rather than fail the
      // whole upload outright.
      const dataUrl = file.type?.startsWith('image/')
        ? await compressImage(file).catch(() => localDb.fileToDataUrl(file))
        : await localDb.fileToDataUrl(file);
      await localDb.put('files', {
        id: newId(),
        name: file.name,
        type: file.type,
        dataUrl,
        created_date: new Date().toISOString(),
      });
      return { file_url: dataUrl, url: dataUrl };
    },
  },
};

// ─── App logs (no-op) ─────────────────────────────────────────────────────────

const appLogs = { logUserInApp: async () => {} };

// ─── Build entities ───────────────────────────────────────────────────────────

const entities = {};
for (const [name, store] of Object.entries(COLLECTION_MAP)) {
  entities[name] = entityMethods(store);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const api = { auth: authModule, entities, integrations: integrationsModule, appLogs };
export default api;
