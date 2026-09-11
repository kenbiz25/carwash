// One-off/rerunnable seeder for role-testing accounts against the live Firebase project.
// Usage: node scripts/seed-qa-accounts.mjs
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "carwash-managerke.firebaseapp.com",
  projectId: "carwash-managerke",
  storageBucket: "carwash-managerke.firebasestorage.app",
  messagingSenderId: "38414357255",
  appId: "1:38414357255:web:430a67291d770ebcc46ba2",
  measurementId: "G-WXKBQT4Q95",
};

const EMAIL = (role) => `kenbiz25+${role}@gmail.com`;
const PASSWORD = (role) => {
  const value = process.env[`SEED_${role.toUpperCase()}_PASSWORD`];
  if (!value) throw new Error(`Set SEED_${role.toUpperCase()}_PASSWORD in your environment before running this script`);
  return value;
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureAccount(role, full_name) {
  const email = EMAIL(role);
  const password = PASSWORD(role);
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } else {
      throw err;
    }
  }
  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      email,
      full_name,
      role: role === "superadmin" ? "admin" : "user",
      created_date: new Date().toISOString(),
    },
    { merge: true }
  );
  await signOut(auth);
  return { email, uid };
}

const roles = [
  { role: "superadmin", full_name: "QA Superadmin" },
  { role: "owner", full_name: "QA Owner" },
  { role: "manager", full_name: "QA Manager" },
  { role: "staff", full_name: "QA Staff" },
  { role: "cashier", full_name: "QA Cashier" },
];

const accounts = {};
for (const { role, full_name } of roles) {
  accounts[role] = await ensureAccount(role, full_name);
  console.log(`✔ ${role.padEnd(11)} ${accounts[role].email}`);
}

// Create/attach a dummy business so owner/manager/staff/cashier roles resolve correctly.
await signInWithEmailAndPassword(auth, accounts.owner.email, PASSWORD("owner"));
const bizRef = doc(db, "businesses", "qa-test-wash");
await setDoc(
  bizRef,
  {
    name: "QA Test Wash",
    location: "Nairobi",
    city: "Nairobi",
    phone: "+254700000000",
    bays_count: 2,
    description: "Dummy business for role-based QA testing",
    owner_email: accounts.owner.email,
    created_by: accounts.owner.email,
    is_active: true,
    subscription_plan: "free",
    member_emails: [
      accounts.owner.email.toLowerCase(),
      accounts.manager.email.toLowerCase(),
      accounts.staff.email.toLowerCase(),
      accounts.cashier.email.toLowerCase(),
    ],
    members: [
      { email: accounts.owner.email, role: "owner" },
      { email: accounts.manager.email, role: "manager" },
      { email: accounts.staff.email, role: "staff" },
      { email: accounts.cashier.email, role: "cashier" },
    ],
  },
  { merge: true }
);
await signOut(auth);

console.log("\n✔ QA Test Wash business ready (id: qa-test-wash)");
console.log(`\nShared password for all QA accounts: ${PASSWORD}`);
process.exit(0);
