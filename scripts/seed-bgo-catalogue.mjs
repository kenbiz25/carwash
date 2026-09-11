// Replaces the demo service catalogue with BGO Shine Hub's real pricelist,
// and renames the seeded demo business to "BGO Shine Hub".
// Usage: node scripts/seed-bgo-catalogue.mjs
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs,
  addDoc, deleteDoc, updateDoc, doc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "carwash-managerke.firebaseapp.com",
  projectId: "carwash-managerke",
  storageBucket: "carwash-managerke.firebasestorage.app",
  messagingSenderId: "38414357255",
  appId: "1:38414357255:web:430a67291d770ebcc46ba2",
  measurementId: "G-WXKBQT4Q95",
};

const BUSINESS_ID = "qa-test-wash";
const OWNER_EMAIL = "kenbiz25+owner@gmail.com";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const nowIso = () => new Date().toISOString();

// [name, category, price_kes, price_suv?, description?]
const PRICELIST = [
  ["Basic Wash (Saloon)", "exterior_wash", 300],
  ["Flash Wash (Saloon)", "exterior_wash", 200],
  ["Basic Wash (SUV)", "exterior_wash", 400],
  ["Flash Wash (SUV)", "exterior_wash", 300],
  ["Vacuuming/Hoovering (Saloon)", "interior_clean", 300],
  ["Vacuuming/Hoovering (SUV)", "interior_clean", 300],
  ["Basic Engine Wash", "mechanical", 300],
  ["Degreaser + Engine Wash", "mechanical", 500],
  ["Engine Steam Wash", "mechanical", 1000],
  ["Interior Steam Wash (Saloon)", "detailing", 1500],
  ["Interior Steam Wash (SUV)", "detailing", 2000],
  ["Under Wash Cleaning (Saloon)", "exterior_wash", 300],
  ["Under Wash Cleaning (SUV)", "exterior_wash", 400],
  ["Roof Cleaning (Saloon)", "exterior_wash", 300],
  ["Roof Cleaning (SUV)", "exterior_wash", 500],
  ["Interior Dashboard Polishing", "interior_clean", 300],
  ["Deep Seats Cleaning (Fabric)", "detailing", 800],
  ["Deep Seats Cleaning (Leather)", "detailing", 1000],
  ["Interior Deep Cleaning (Saloon)", "detailing", 1500],
  ["Interior Deep Cleaning (SUV)", "detailing", 2500],
  ["Tyre Shiner", "add_on", 100, 200],
  ["Waxing (Saloon)", "add_on", 500],
  ["Waxing (SUV)", "add_on", 800],
  ["Buffing (Saloon)", "detailing", 3000],
  ["Buffing (SUV)", "detailing", 5000],
  ["Headlights Restoration", "add_on", 1000],
  ["Watermarks Removal", "add_on", 1500],
  ["Rim Restoration", "add_on", 1000, 2000],
  ["Air-Fresheners", "add_on", 250, null, "Ksh 250 / 300 / 600 depending on scent/type"],
  ["Dashboard Polish Spray", "add_on", 600],
  ["Dashboard Polish Cream", "add_on", 1000],
  ["Public Matatus", "exterior_wash", 300],
  ["Private Matatus", "exterior_wash", 400, 500, "Ksh 400 (14-seater) / 500 (33-seater)"],
  ["Public Bus", "exterior_wash", 600],
  ["Private/School Bus", "exterior_wash", 800],
  ["Big Lorries (Carwash)", "exterior_wash", 1000],
  ["Big Lorries (Greasing)", "mechanical", 1000],
  ["Medium-Sized Lorries (Carwash)", "exterior_wash", 700],
  ["Medium-Sized Lorries (Greasing)", "mechanical", 800],
  ["Mini Lorries/Canter (Carwash)", "exterior_wash", 500],
  ["Mini Lorries/Canter (Greasing)", "mechanical", 600],
  ["Carpet Cleaning (per m²)", "add_on", 200, 250, "Ksh 200-250 per square meter depending on carpet type"],
  ["Spare Wash", "add_on", 250],
];

async function main() {
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  console.log("✔ signed in as owner");

  // Remove the old placeholder demo services
  const oldSnap = await getDocs(query(collection(db, "services"), where("business_id", "==", BUSINESS_ID)));
  for (const d of oldSnap.docs) {
    await deleteDoc(doc(db, "services", d.id));
  }
  console.log(`✔ removed ${oldSnap.size} old demo services`);

  // Rename the business
  await updateDoc(doc(db, "businesses", BUSINESS_ID), {
    name: "BGO Shine Hub",
    description: "Car wash & carpet cleaning",
    updated_date: nowIso(),
  });
  console.log("✔ renamed business to BGO Shine Hub");

  // Add the real pricelist
  let sort_order = 1;
  for (const [name, category, price_kes, price_suv, description] of PRICELIST) {
    const entry = {
      business_id: BUSINESS_ID,
      name,
      category,
      price_kes,
      is_active: true,
      sort_order: sort_order++,
      requires_photo_proof: false,
      created_date: nowIso(),
      updated_date: nowIso(),
    };
    if (price_suv != null) entry.price_suv = price_suv;
    if (description) entry.description = description;
    await addDoc(collection(db, "services"), entry);
  }
  console.log(`✔ added ${PRICELIST.length} BGO Shine Hub services`);

  await signOut(auth);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
