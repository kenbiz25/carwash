import { chromium } from "playwright";

// Single shared browser context = simulates ONE physical computer/browser
// where different staff log in/out throughout the day (the realistic case
// for a single front-desk device). Cross-DEVICE sharing is a separate question.
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

async function login(email, password) {
  await page.goto("http://localhost:5183/Login");
  await page.waitForSelector("input#email", { timeout: 15000 });
  await page.fill("input#email", email);
  await page.fill("input#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/Dashboard/, { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function logout() {
  await page.click('header button:has(svg.lucide-menu), header [class*="Avatar"]').catch(() => {});
  // open user menu via avatar button (last button in header before it)
  const avatarBtn = page.locator('header button:has(span:has-text(""))').last();
  await page.locator("header").getByRole("button").last().click();
  await page.waitForTimeout(300);
  await page.click('text="Logout"');
  await page.waitForURL(/Login/, { timeout: 10000 });
}

await login("kenbiz25+owner@gmail.com", "owner123");
await page.click('button:has-text("Check-In Vehicle")');
await page.waitForSelector('text="Plate Number *"', { timeout: 10000 });
await page.fill('input[placeholder="KAA 123B"]', "KSC777Z");
await page.click('button:has-text("Next: Select Services")');
await page.waitForTimeout(300);
await page.locator('div.cursor-pointer:has(p.font-medium)').first().click();
await page.waitForTimeout(300);
await page.click('button:has-text("Next: Photos")');
await page.waitForTimeout(300);
await page.click('button:has-text("Next: Assign")');
await page.waitForTimeout(300);
await page.click('button:has-text("Select staff")');
await page.waitForTimeout(300);
await page.click('[role="option"]:has-text("John Kamau")');
await page.waitForTimeout(200);
await page.click('button:has-text("Check In Vehicle")');
await page.waitForTimeout(1500);
console.log("Owner check-in done for KSC777Z assigned to John Kamau");

await logout();

await login("kenbiz25+staff@gmail.com", "staff123");
const bellButton = page.locator("header button:has(svg.lucide-bell)");
await bellButton.click();
await page.waitForTimeout(500);
const dropdownText = await page.textContent("body");
console.log("Bell shows 'New job assigned to you':", dropdownText.includes("New job assigned to you"));
console.log("Bell shows the plate KSC777Z:", dropdownText.includes("KSC777Z"));
await page.screenshot({ path: "scripts/smoke-samecontext-bell.png" });

await browser.close();
