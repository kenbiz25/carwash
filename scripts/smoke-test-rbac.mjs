import { chromium } from "playwright";

const accounts = [
  { role: "staff", email: "kenbiz25+staff@gmail.com", password: process.env.SEED_STAFF_PASSWORD },
  { role: "cashier", email: "kenbiz25+cashier@gmail.com", password: process.env.SEED_CASHIER_PASSWORD },
  { role: "owner", email: "kenbiz25+owner@gmail.com", password: process.env.SEED_OWNER_PASSWORD },
];

const browser = await chromium.launch();
let anyError = false;

for (const acc of accounts) {
  const errors = [];
  const page = await browser.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

  await page.goto("http://localhost:5183/Login");
  await page.waitForSelector('input#email', { timeout: 15000 });
  await page.fill('input#email', acc.email);
  await page.fill('input#password', acc.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/Dashboard/, { timeout: 15000 });
  await page.waitForTimeout(2000);

  const bodyText = await page.textContent("body");
  console.log(`\n=== ${acc.role} ===`);
  console.log("Has 'My Work' panel (staff):", bodyText.includes("My Work"));
  console.log("Has 'Today's Collections' panel (cashier):", bodyText.includes("Today's Collections"));
  console.log("Has carpet check-in button (should be false, everywhere):", bodyText.includes("Carpet Check-in"));

  // Check Reports link visibility by expanding sidebar
  await page.click('aside button:has(svg.lucide-chevron-left)').catch(() => {});
  await page.waitForTimeout(300);
  const sidebarText = await page.textContent("aside").catch(() => "");
  console.log("Reports & Analytics link visible:", sidebarText.includes("Reports & Analytics"));
  console.log("Settings & Users link visible (should be owner-only):", sidebarText.includes("Settings & Users"));

  await page.screenshot({ path: `scripts/smoke-rbac-${acc.role}.png`, fullPage: true });
  console.log("Errors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
  if (errors.length) anyError = true;
  await page.close();
}

await browser.close();
process.exit(anyError ? 1 : 0);
