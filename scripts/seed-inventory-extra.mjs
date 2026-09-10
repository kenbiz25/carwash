// Adds more inventory items so every category (chemicals, equipment, consumables, utilities, other) is represented.
// Usage: node scripts/seed-inventory-extra.mjs
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const nowIso = () => new Date().toISOString();

const items = [
  { item_name: "Wax Polish", category: "chemicals", quantity: 15, unit: "liters", unit_cost: 900, low_stock_threshold: 5, usage_per_wash: 0.2 },
  { item_name: "Interior Upholstery Cleaner", category: "chemicals", quantity: 12, unit: "liters", unit_cost: 700, low_stock_threshold: 5, usage_per_wash: 0.15 },
  { item_name: "Pressure Washer", category: "equipment", quantity: 2, unit: "units", unit_cost: 45000, low_stock_threshold: 1, usage_per_wash: 0 },
  { item_name: "Vacuum Cleaner", category: "equipment", quantity: 3, unit: "units", unit_cost: 18000, low_stock_threshold: 1, usage_per_wash: 0 },
  { item_name: "Wash Mitts", category: "consumables", quantity: 30, unit: "pieces", unit_cost: 120, low_stock_threshold: 10, usage_per_wash: 1 },
  { item_name: "Hand Gloves", category: "consumables", quantity: 3, unit: "pairs", unit_cost: 50, low_stock_threshold: 10, usage_per_wash: 1 },
  { item_name: "Electricity Credit", category: "utilities", quantity: 200, unit: "units", unit_cost: 25, low_stock_threshold: 50, usage_per_wash: 2 },
  { item_name: "Waste Disposal Bags", category: "other", quantity: 45, unit: "pieces", unit_cost: 20, low_stock_threshold: 15, usage_per_wash: 1 },
  { item_name: "First Aid Kit", category: "other", quantity: 1, unit: "kit", unit_cost: 2500, low_stock_threshold: 1, usage_per_wash: 0 },
];

async function main() {
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  for (const i of items) {
    await addDoc(collection(db, "inventory"), {
      business_id: BUSINESS_ID,
      supplier_name: "Kenya Chemicals Ltd",
      supplier_phone: "0733445566",
      auto_deduct: true,
      last_restock_date: nowIso().split("T")[0],
      last_restock_quantity: i.quantity,
      created_date: nowIso(),
      updated_date: nowIso(),
      ...i,
    });
  }
  console.log(`✔ added ${items.length} inventory items (chemicals, equipment, consumables, utilities, other)`);
  await signOut(auth);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
