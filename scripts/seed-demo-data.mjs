// Populates realistic demo data into the "QA Test Wash" business (id: qa-test-wash)
// so the app has something to show while demoing locally.
// Usage: node scripts/seed-demo-data.mjs
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
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
const MANAGER_EMAIL = "kenbiz25+manager@gmail.com";
const STAFF_EMAIL = "kenbiz25+staff@gmail.com";
const CASHIER_EMAIL = "kenbiz25+cashier@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const nowIso = () => new Date().toISOString();
const pad2 = (n) => String(n).padStart(2, "0");

function daysAgoAt(daysAgo, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function washNumber(date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `W${yy}${mm}${dd}-${suffix}`;
}

function platNumber() {
  const letters = () => Array.from({ length: 3 }, () => String.fromCharCode(65 + rand(0, 25))).join("");
  return `K${letters().slice(0, 2)}${rand(100, 999)}${String.fromCharCode(65 + rand(0, 25))}`;
}

function phone() {
  return `07${rand(10000000, 99999999)}`;
}

async function main() {
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
  console.log("✔ signed in as owner");

  // ── Business tweaks ─────────────────────────────────────────────
  await updateDoc(doc(db, "businesses", BUSINESS_ID), {
    bays_count: 4,
    admin_emails: [MANAGER_EMAIL],
    updated_date: nowIso(),
  });

  // ── Services ─────────────────────────────────────────────────────
  const serviceDefs = [
    { name: "Full Body Wash", description: "Exterior foam wash, rinse, and dry", category: "exterior_wash", price_kes: 500, price_suv: 700, price_van: 900, duration_minutes: 30, sort_order: 1 },
    { name: "Interior Vacuum & Clean", description: "Vacuum seats, mats, and dashboard wipe-down", category: "interior_clean", price_kes: 400, price_suv: 500, price_van: 600, duration_minutes: 25, sort_order: 2 },
    { name: "Full Detailing", description: "Deep interior & exterior detailing", category: "detailing", price_kes: 2500, price_suv: 3000, price_van: 3500, duration_minutes: 120, sort_order: 3 },
    { name: "Engine Bay Wash", description: "Degrease and rinse engine bay", category: "mechanical", price_kes: 300, price_suv: 400, price_van: 500, duration_minutes: 20, sort_order: 4 },
    { name: "Wax & Polish", description: "Hand wax and polish for a glossy finish", category: "add_on", price_kes: 600, price_suv: 800, price_van: 1000, duration_minutes: 40, sort_order: 5 },
    { name: "Premium Package", description: "Full body wash + interior clean + wax", category: "package", price_kes: 1200, price_suv: 1500, price_van: 1800, duration_minutes: 60, sort_order: 6, is_package: true },
  ];
  const services = [];
  for (const s of serviceDefs) {
    const ref = await addDoc(collection(db, "services"), {
      business_id: BUSINESS_ID,
      is_active: true,
      requires_photo_proof: false,
      created_date: nowIso(),
      updated_date: nowIso(),
      ...s,
    });
    services.push({ id: ref.id, ...s });
  }
  console.log(`✔ ${services.length} services`);

  // ── Staff ────────────────────────────────────────────────────────
  const staffDefs = [
    { name: "John Kamau", phone: phone(), role: "washer", commission_rate: 10 },
    { name: "Grace Njeri", phone: phone(), role: "washer", commission_rate: 10 },
    { name: "Peter Otieno", phone: phone(), role: "cashier", commission_rate: 5, user_email: CASHIER_EMAIL },
    { name: "Mary Wambui", phone: phone(), role: "supervisor", commission_rate: 8, user_email: MANAGER_EMAIL },
  ];
  const staff = [];
  for (const s of staffDefs) {
    const ref = await addDoc(collection(db, "staff"), {
      business_id: BUSINESS_ID,
      skills: [],
      photo_url: "",
      is_active: true,
      total_washes: 0,
      total_earnings: 0,
      created_date: nowIso(),
      updated_date: nowIso(),
      ...s,
    });
    staff.push({ id: ref.id, ...s });
  }
  console.log(`✔ ${staff.length} staff`);
  const washers = staff.filter((s) => s.role === "washer" || s.role === "supervisor");

  // ── Inventory ────────────────────────────────────────────────────
  const inventoryDefs = [
    { item_name: "Car Shampoo", category: "chemicals", quantity: 25, unit: "liters", unit_cost: 350, low_stock_threshold: 5, usage_per_wash: 0.3 },
    { item_name: "Microfiber Towels", category: "equipment", quantity: 40, unit: "pieces", unit_cost: 150, low_stock_threshold: 10, usage_per_wash: 1 },
    { item_name: "Tire Shine", category: "chemicals", quantity: 6, unit: "liters", unit_cost: 500, low_stock_threshold: 10, usage_per_wash: 0.1 },
    { item_name: "Air Freshener", category: "consumables", quantity: 60, unit: "pieces", unit_cost: 80, low_stock_threshold: 15, usage_per_wash: 0.2 },
    { item_name: "Water", category: "utilities", quantity: 500, unit: "liters", unit_cost: 5, low_stock_threshold: 100, usage_per_wash: 40 },
  ];
  for (const i of inventoryDefs) {
    await addDoc(collection(db, "inventory"), {
      business_id: BUSINESS_ID,
      supplier_name: "Kenya Chemicals Ltd",
      supplier_phone: phone(),
      auto_deduct: true,
      last_restock_date: nowIso().split("T")[0],
      last_restock_quantity: i.quantity,
      created_date: nowIso(),
      updated_date: nowIso(),
      ...i,
    });
  }
  console.log(`✔ ${inventoryDefs.length} inventory items`);

  // ── Washes + Payments ────────────────────────────────────────────
  const customerNames = [
    "Jane Wanjiku", "David Mwangi", "Susan Achieng", "Brian Kiptoo", "Alice Nyambura",
    "Kevin Otieno", "Faith Wairimu", "Samuel Njoroge", "Esther Chebet", "James Mutua",
  ];
  const vehicleTypes = ["saloon", "suv", "van", "pickup"];
  const makes = ["Toyota", "Nissan", "Mazda", "Subaru", "Honda", "Isuzu"];
  const colors = ["White", "Black", "Silver", "Blue", "Red"];

  let paidCount = 0, activeCount = 0;
  const TOTAL_WASHES = 32;
  for (let i = 0; i < TOTAL_WASHES; i++) {
    const isRecent = i < 5; // last 5 are "today" and still in progress
    const dayOffset = isRecent ? 0 : rand(1, 13);
    const hour = isRecent ? rand(7, 17) : rand(7, 19);
    const entryDate = daysAgoAt(dayOffset, hour, rand(0, 59));

    const svc1 = pick(services);
    const useSecond = Math.random() > 0.6;
    const svc2 = useSecond ? pick(services) : null;
    const selectedServices = [svc1, svc2].filter(Boolean);
    const amount = selectedServices.reduce((sum, s) => sum + s.price_kes, 0);
    const washer = pick(washers);

    const status = isRecent ? pick(["waiting", "washing", "done"]) : "paid";
    const isPaid = status === "paid";
    const svcStatus = status === "waiting" ? "pending" : status === "washing" ? "in_progress" : "completed";

    const washDoc = {
      business_id: BUSINESS_ID,
      type: "vehicle",
      wash_number: washNumber(entryDate),
      plate_number: platNumber(),
      vehicle_type: pick(vehicleTypes),
      vehicle_make: pick(makes),
      vehicle_model: "",
      vehicle_color: pick(colors),
      customer_name: pick(customerNames),
      customer_phone: phone(),
      services: selectedServices.map((s) => ({
        service_id: s.id, name: s.name, category: s.category, price: s.price_kes, status: svcStatus,
      })),
      assigned_staff_id: washer.id,
      assigned_staff_name: washer.name,
      checked_in_by: CASHIER_EMAIL,
      bay_number: rand(1, 4),
      notes: "",
      damage_notes: "",
      photos_before: [],
      photos_after: [],
      photos_proof: [],
      amount_due: amount,
      amount_paid: isPaid ? amount : 0,
      payment_method: isPaid ? pick(["mpesa", "cash"]) : "",
      discount_amount: 0,
      discount_reason: "",
      entry_time: entryDate.toISOString(),
      start_time: status !== "waiting" ? entryDate.toISOString() : "",
      exit_time: isPaid ? new Date(entryDate.getTime() + rand(20, 50) * 60000).toISOString() : "",
      status,
      created_date: entryDate.toISOString(),
      updated_date: nowIso(),
    };
    if (isPaid && Math.random() > 0.4) {
      washDoc.customer_feedback = { rating: pick([4, 4, 5, 5, 5, 3]), comment: pick(["Great job!", "Very fast service", "Car looks brand new", "Good work, will return"]) };
    }

    const washRef = await addDoc(collection(db, "washes"), washDoc);

    if (isPaid) {
      const method = washDoc.payment_method;
      await addDoc(collection(db, "payments"), {
        business_id: BUSINESS_ID,
        wash_id: washRef.id,
        amount,
        method,
        phone_number: method === "mpesa" ? washDoc.customer_phone : "",
        transaction_ref: `${method === "mpesa" ? "MPESA" : "CASH"}${entryDate.getTime()}`,
        mpesa_receipt: method === "mpesa" ? Math.random().toString(36).slice(2, 12).toUpperCase() : "",
        status: "confirmed",
        created_date: washDoc.exit_time,
        updated_date: washDoc.exit_time,
      });
      paidCount++;
    } else {
      activeCount++;
    }
  }
  console.log(`✔ ${TOTAL_WASHES} washes (${paidCount} paid, ${activeCount} active in queue)`);

  // ── Job Orders ───────────────────────────────────────────────────
  const jobOrderDefs = [
    { flow_type: "drive_in", status: "collected", payment_status: "paid", daysAgo: 3 },
    { flow_type: "drive_in", status: "ready", payment_status: "partial", daysAgo: 0 },
    { flow_type: "drop_off", status: "in_progress", payment_status: "unpaid", daysAgo: 0 },
    { flow_type: "drop_off", status: "pending", payment_status: "unpaid", daysAgo: 0 },
    { flow_type: "drive_in", status: "collected", payment_status: "paid", daysAgo: 5 },
    { flow_type: "drop_off", status: "collected", payment_status: "paid", daysAgo: 7 },
  ];
  let joCounter = 1;
  for (const jo of jobOrderDefs) {
    const brought = daysAgoAt(jo.daysAgo, rand(8, 16));
    const svc = pick(services);
    const amount = svc.price_kes;
    const washer = pick(washers);
    const isPaid = jo.payment_status === "paid";
    const isPartial = jo.payment_status === "partial";
    const doc_ = {
      business_id: BUSINESS_ID,
      order_number: `JO-${String(Date.now()).slice(-5)}${joCounter++}`,
      flow_type: jo.flow_type,
      customer_name: pick(customerNames),
      customer_phone: phone(),
      plate_number: platNumber(),
      vehicle_type: pick(vehicleTypes),
      vehicle_make: pick(makes),
      vehicle_color: pick(colors),
      services_selected: [{ name: svc.name, price: svc.price_kes }],
      special_requests: "",
      bay_number: String(rand(1, 4)),
      allocated_worker_id: washer.id,
      allocated_worker_name: washer.name,
      photos_before: [], photos_during: [], photos_after: [],
      amount,
      deposit_paid: isPartial ? Math.round(amount / 2) : 0,
      deposit_method: isPartial ? "cash" : "none",
      deposit_ref: "",
      amount_paid: isPaid ? amount : isPartial ? Math.round(amount / 2) : 0,
      payment_method: isPaid || isPartial ? pick(["mpesa", "cash"]) : "pending",
      payment_status: jo.payment_status,
      receipt_number: isPaid ? `RCPT${rand(10000, 99999)}` : "",
      mpesa_ref: "",
      status: jo.status,
      in_progress_status: jo.status === "in_progress" ? "Washing Exterior" : "",
      quality_checklist: {},
      issues_found: "",
      handover_notes: "",
      status_history: [{ status: jo.status, note: "", at: brought.toISOString() }],
      priority: pick(["normal", "normal", "normal", "urgent"]),
      notes: "",
      date_brought: brought.toISOString(),
      date_to_collect: new Date(brought.getTime() + 4 * 3600000).toISOString().slice(0, 16),
      date_collected: jo.status === "collected" ? new Date(brought.getTime() + 5 * 3600000).toISOString() : "",
      created_date: brought.toISOString(),
      updated_date: nowIso(),
    };
    if (jo.flow_type === "drop_off") {
      doc_.customer_email = "";
      doc_.drop_off_items = ["Car floor mats"];
      doc_.carpet_size = pick(["small", "medium", "large"]);
      doc_.items_count = 1;
      doc_.items_description = "Set of 4 floor mats";
      doc_.condition_on_arrival = ["Heavy mud"];
    }
    await addDoc(collection(db, "jobOrders"), doc_);
  }
  console.log(`✔ ${jobOrderDefs.length} job orders`);

  // ── Loyalty Customers ────────────────────────────────────────────
  const loyaltyDefs = [
    { name: "Jane Wanjiku", visits_count: 12, points: 850, total_spent: 8500 },
    { name: "David Mwangi", visits_count: 7, points: 420, total_spent: 4200 },
    { name: "Susan Achieng", visits_count: 20, points: 1600, total_spent: 16000 },
    { name: "Brian Kiptoo", visits_count: 3, points: 150, total_spent: 1500 },
    { name: "Alice Nyambura", visits_count: 9, points: 610, total_spent: 6100 },
  ];
  for (const c of loyaltyDefs) {
    await addDoc(collection(db, "loyaltyCustomers"), {
      business_id: BUSINESS_ID,
      phone: phone(),
      email: "",
      last_visit_date: daysAgoAt(rand(0, 5), rand(8, 18)).toISOString(),
      created_date: nowIso(),
      updated_date: nowIso(),
      ...c,
    });
  }
  console.log(`✔ ${loyaltyDefs.length} loyalty customers`);

  // ── Schedules (this week) ─────────────────────────────────────────
  let scheduleCount = 0;
  for (let d = -3; d <= 3; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    for (const s of staff) {
      await addDoc(collection(db, "schedules"), {
        business_id: BUSINESS_ID,
        staff_id: s.id,
        staff_name: s.name,
        date: dateStr,
        shift_start: "08:00",
        shift_end: "17:00",
        bay_assignment: s.role === "washer" ? rand(1, 4) : null,
        notes: "",
        status: d < 0 ? "clocked_out" : d === 0 ? "clocked_in" : "scheduled",
        created_date: nowIso(),
        updated_date: nowIso(),
      });
      scheduleCount++;
    }
  }
  console.log(`✔ ${scheduleCount} schedule entries`);

  // ── Memberships (loyalty plans) ────────────────────────────────────
  const membershipDefs = [
    { name: "Basic Monthly", description: "4 exterior washes per month", price_monthly: 1800, included_washes: 4, discount_percent: 0, benefits: ["4 exterior washes per month"] },
    { name: "Premium Monthly", description: "8 washes + 10% off add-ons", price_monthly: 4000, price_yearly: 40000, included_washes: 8, discount_percent: 10, benefits: ["8 exterior washes per month", "10% off all services"] },
    { name: "VIP Unlimited", description: "Unlimited washes, priority bay", price_monthly: 9000, price_yearly: 90000, included_washes: -1, discount_percent: 15, benefits: ["Unlimited washes", "Priority bay assignment", "15% off detailing"] },
  ];
  const memberships = [];
  for (const m of membershipDefs) {
    const ref = await addDoc(collection(db, "memberships"), {
      business_id: BUSINESS_ID,
      is_active: true,
      created_date: nowIso(),
      updated_date: nowIso(),
      ...m,
    });
    memberships.push({ id: ref.id, ...m });
  }
  console.log(`✔ ${memberships.length} membership plans`);

  // ── Customer Subscriptions ─────────────────────────────────────────
  const subDefs = [
    { membership: memberships[1], customer_name: "Susan Achieng", washes_used: 3, washes_remaining: 5 },
    { membership: memberships[2], customer_name: "David Mwangi", washes_used: 12, washes_remaining: -1 },
  ];
  for (const s of subDefs) {
    await addDoc(collection(db, "customerSubscriptions"), {
      business_id: BUSINESS_ID,
      membership_id: s.membership.id,
      membership_name: s.membership.name,
      customer_name: s.customer_name,
      customer_phone: phone(),
      status: "active",
      washes_used: s.washes_used,
      washes_remaining: s.washes_remaining,
      next_billing_date: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
      created_date: nowIso(),
      updated_date: nowIso(),
    });
  }
  console.log(`✔ ${subDefs.length} customer subscriptions`);

  await signOut(auth);
  console.log("\nDone. Log in as owner/manager/staff/cashier to see the demo data.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
