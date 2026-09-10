// Exports the BGO Shine Hub business and all its data from Firestore into a JSON
// file, so it can be preloaded into the new local (IndexedDB) data layer.
// Usage: node scripts/export-firestore-data.mjs
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { writeFileSync } from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyABaO9d60tQEUPEVI7clu595vjr_yTPyME",
  authDomain: "carwash-managerke.firebaseapp.com",
  projectId: "carwash-managerke",
  storageBucket: "carwash-managerke.firebasestorage.app",
  messagingSenderId: "38414357255",
  appId: "1:38414357255:web:430a67291d770ebcc46ba2",
  measurementId: "G-WXKBQT4Q95",
};

const BUSINESS_ID = "qa-test-wash";
const OWNER_EMAIL = "kenbiz25+owner@gmail.com";
const OWNER_PASSWORD = "owner123";
const SUPERADMIN_EMAIL = "kenbiz25+superadmin@gmail.com";
const SUPERADMIN_PASSWORD = "superadmin123";
const USER_UIDS = [
  "SvrMBj9GtPRZQWdOI0cdGFfOPLB2", // owner
  "ejOMbFupv6O1rDVpCx2Mswzg0kv1", // manager
  "jaAyhOeE0IRJxgPHCOCLLSxSyKw1", // staff
  "g45at5jc68dP9nl9DDxzLfi4TL32", // cashier
  "r3i35TQciwReG96BGIm21dEeTGr1", // superadmin
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BUSINESS_SCOPED_COLLECTIONS = [
  "washes", "payments", "staff", "services", "inventory",
  "loyaltyCustomers", "schedules", "cctvFeeds", "jobOrders",
  "memberships", "customerSubscriptions",
];

const normalize = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

async function main() {
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  console.log("✔ signed in as owner");

  const bizSnap = await getDoc(doc(db, "businesses", BUSINESS_ID));
  const business = { id: bizSnap.id, ...bizSnap.data() };

  const out = { businesses: [business] };
  for (const col of BUSINESS_SCOPED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, col), where("business_id", "==", BUSINESS_ID)));
    out[col] = normalize(snap);
    console.log(`✔ ${col}: ${out[col].length}`);
  }

  await signOut(auth);

  // Users collection requires reading other people's profiles — only superadmin can do that.
  await signInWithEmailAndPassword(auth, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
  out.users = [];
  for (const uid of USER_UIDS) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) out.users.push({ id: snap.id, ...snap.data() });
  }
  console.log(`✔ users: ${out.users.length}`);
  await signOut(auth);

  writeFileSync(
    new URL("../src/lib/local-seed-data.json", import.meta.url),
    JSON.stringify(out, null, 2)
  );
  console.log("\n✔ wrote src/lib/local-seed-data.json");
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
