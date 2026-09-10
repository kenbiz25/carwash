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
  LoyaltyCustomer: 'loyaltyCustomers',
  Schedule: 'schedules',
  CCTVFeed: 'cctvFeeds',
  JobOrder: 'jobOrders',
  Membership: 'memberships',
  CustomerSubscription: 'customerSubscriptions',
  BusinessSubscription: 'businessSubscriptions',
  Notification: 'notifications',
  Invitation: 'invitations',
};

// Firestore rejected undefined values — keep the same normalization so
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
      // Single id lookup — mirrors the old direct getDoc shortcut.
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

    const existing = await localDb.get('users', currentUser.uid);
    if (!existing) {
      const profile = {
        id: currentUser.uid,
        uid: currentUser.uid,
        email: currentUser.email,
        full_name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
        avatar_url: currentUser.photoURL || '',
        role: 'user',
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
// Replaces Firebase Storage — files are kept as base64 data URLs in the local
// `files` store, so the returned URL is a plain string usable directly as an
// <img src> or link, same as a Storage download URL was.

const integrationsModule = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('No file provided');
      const dataUrl = await localDb.fileToDataUrl(file);
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
