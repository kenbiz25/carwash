import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/CustomerPortal");
await page.waitForSelector('text="Customer Portal"', { timeout: 15000 });
await page.fill('input[type="tel"]', "0730450108");
await page.click('button:has-text("View My Account")');
await page.waitForTimeout(1500);

const bodyText = await page.textContent("body");
console.log("Shows customer name (David Mwangi):", bodyText.includes("David Mwangi"));
console.log("Shows points (420):", bodyText.includes("420"));
console.log("Shows visits (7):", /\b7\b/.test(bodyText));
console.log("History tab shows wash entries (not 'No wash history'):", !bodyText.includes("No wash history yet"));

await page.screenshot({ path: "scripts/smoke-customerportal.png", fullPage: true });

// Also check the Landing page footer link works
await page.goto("http://localhost:5183/Landing");
await page.waitForTimeout(1000);
const footerLink = page.locator('a:has-text("My Wash History")');
console.log("Footer link exists on Landing:", await footerLink.count() > 0);

await browser.close();
console.log("\nErrors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
process.exit(errors.length ? 1 : 0);
