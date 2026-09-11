import { chromium } from "playwright";

const browser = await chromium.launch();
const errors = [];

// ── 1. Owner checks in a vehicle assigned to John Kamau (staff) ──────────
const ownerPage = await browser.newPage();
ownerPage.on("console", (msg) => { if (msg.type() === "error") errors.push("[owner] " + msg.text()); });
ownerPage.on("pageerror", (err) => errors.push("[owner] pageerror: " + err.message));

await ownerPage.goto("http://localhost:5183/Login");
await ownerPage.waitForSelector("input#email", { timeout: 15000 });
await ownerPage.fill("input#email", "kenbiz25+owner@gmail.com");
await ownerPage.fill("input#password", process.env.SEED_OWNER_PASSWORD);
await ownerPage.click('button[type="submit"]');
await ownerPage.waitForURL(/Dashboard/, { timeout: 15000 });
await ownerPage.waitForTimeout(1500);

await ownerPage.click('button:has-text("Check-In Vehicle")');
await ownerPage.waitForSelector('text="Plate Number *"', { timeout: 10000 });
await ownerPage.screenshot({ path: "scripts/dbg-1-details.png" });
await ownerPage.fill('input[placeholder="KAA 123B"]', "KTS999X");
await ownerPage.click('button:has-text("Next: Select Services")');
await ownerPage.waitForTimeout(300);
// pick the first service card
await ownerPage.locator('div.cursor-pointer:has(p.font-medium)').first().click();
await ownerPage.waitForTimeout(300);
await ownerPage.click('button:has-text("Next: Photos")');
await ownerPage.waitForTimeout(300);
await ownerPage.click('button:has-text("Next: Assign")');
await ownerPage.waitForTimeout(300);

// Assign staff — Radix select
await ownerPage.click('button:has-text("Select staff")');
await ownerPage.waitForTimeout(300);
await ownerPage.click('[role="option"]:has-text("John Kamau")');
await ownerPage.waitForTimeout(200);

await ownerPage.click('button:has-text("Check In Vehicle")');
await ownerPage.waitForTimeout(1500);

const toastText = await ownerPage.textContent("body");
console.log("Check-in toast shown:", toastText.includes("checked in successfully"));
console.log("Owner-side errors so far:", errors.length ? "\n- " + errors.join("\n- ") : "none");

const dbCheck = await ownerPage.evaluate(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open("bgo_local_db");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("washes", "readonly");
      const getAll = tx.objectStore("washes").getAll();
      getAll.onsuccess = () => {
        const wash = getAll.result.find((w) => w.plate_number === "KTS999X");
        resolve(wash ? { assigned_staff_id: wash.assigned_staff_id, assigned_staff_name: wash.assigned_staff_name } : "NOT FOUND");
      };
    };
  });
});
console.log("Wash record in IndexedDB:", JSON.stringify(dbCheck));

const notifCheck = await ownerPage.evaluate(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open("bgo_local_db");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("notifications", "readonly");
      const getAll = tx.objectStore("notifications").getAll();
      getAll.onsuccess = () => resolve(getAll.result);
    };
  });
});
console.log("All notification records:", JSON.stringify(notifCheck, null, 2));

await ownerPage.close();

// ── 2. Staff logs in and checks the notification bell ────────────────────
const staffPage = await browser.newPage();
staffPage.on("console", (msg) => { if (msg.type() === "error") errors.push("[staff] " + msg.text()); });
staffPage.on("pageerror", (err) => errors.push("[staff] pageerror: " + err.message));

await staffPage.goto("http://localhost:5183/Login");
await staffPage.waitForSelector("input#email", { timeout: 15000 });
await staffPage.fill("input#email", "kenbiz25+staff@gmail.com");
await staffPage.fill("input#password", process.env.SEED_STAFF_PASSWORD);
await staffPage.click('button[type="submit"]');
await staffPage.waitForURL(/Dashboard/, { timeout: 15000 });
await staffPage.waitForTimeout(2000);

const bellButton = staffPage.locator("header button:has(svg.lucide-bell)");
await bellButton.click();
await staffPage.waitForTimeout(500);
const dropdownText = await staffPage.textContent("body");
console.log("Bell shows 'New job assigned to you':", dropdownText.includes("New job assigned to you"));
console.log("Bell shows the plate KTS999X:", dropdownText.includes("KTS999X"));

await staffPage.screenshot({ path: "scripts/smoke-notif-staff.png" });

// Click the notification to mark read, then verify badge disappears
await staffPage.click('text="New job assigned to you"');
await staffPage.waitForTimeout(500);
await bellButton.click(); // close
await staffPage.waitForTimeout(200);
await bellButton.click(); // reopen
await staffPage.waitForTimeout(500);
const badgeCount = await staffPage.locator("header button:has(svg.lucide-bell) span").count();
console.log("Unread badge gone after marking read:", badgeCount === 0);

await staffPage.close();
await browser.close();

console.log("\nErrors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
process.exit(errors.length ? 1 : 0);
