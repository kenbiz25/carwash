// Diagnostic: for each QA role account, check what business/data resolution looks like.
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "njiru-carwash.firebaseapp.com",
  projectId: "njiru-carwash",
  storageBucket: "njiru-carwash.firebasestorage.app",
  messagingSenderId: "112675754201",
  appId: "1:112675754201:web:55eb9b48ed58432d912ec8",
  measurementId: "G-2P8489N3N7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const accounts = [
  { role: "owner", email: "kenbiz25+owner@gmail.com", password: process.env.SEED_OWNER_PASSWORD },
  { role: "manager", email: "kenbiz25+manager@gmail.com", password: process.env.SEED_MANAGER_PASSWORD },
  { role: "staff", email: "kenbiz25+staff@gmail.com", password: process.env.SEED_STAFF_PASSWORD },
  { role: "cashier", email: "kenbiz25+cashier@gmail.com", password: process.env.SEED_CASHIER_PASSWORD },
  { role: "superadmin", email: "kenbiz25+superadmin@gmail.com", password: process.env.SEED_SUPERADMIN_PASSWORD },
];

for (const acc of accounts) {
  console.log(`\n=== ${acc.role} (${acc.email}) ===`);
  try {
    const cred = await signInWithEmailAndPassword(auth, acc.email, acc.password);
    const userSnap = await getDoc(doc(db, "users", cred.user.uid));
    console.log("user doc:", userSnap.exists() ? userSnap.data() : "MISSING");

    const email = acc.email.toLowerCase();
    const ownedSnap = await getDocs(query(collection(db, "businesses"), where("owner_email", "==", acc.email)));
    console.log("owned businesses:", ownedSnap.docs.map((d) => d.id));

    let memberSnap;
    try {
      memberSnap = await getDocs(query(collection(db, "businesses"), where("member_emails", "array-contains", email)));
      console.log("member businesses:", memberSnap.docs.map((d) => d.id));
    } catch (err) {
      console.log("member query ERROR:", err.code || err.message);
    }

    try {
      const washSnap = await getDocs(query(collection(db, "washes"), where("business_id", "==", "qa-test-wash")));
      console.log("washes visible:", washSnap.size);
    } catch (err) {
      console.log("washes query ERROR:", err.code || err.message);
    }
  } catch (err) {
    console.log("SIGN-IN ERROR:", err.code || err.message);
  }
  await signOut(auth).catch(() => {});
}
process.exit(0);
