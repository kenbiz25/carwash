import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/Login");
await page.waitForSelector("input#email", { timeout: 15000 });
await page.fill("input#email", "kenbiz25+owner@gmail.com");
await page.fill("input#password", process.env.SEED_OWNER_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/Dashboard/, { timeout: 15000 });

// 1. Edit "Basic Wash (Saloon)" price from 300 to 999 in the catalogue
await page.goto("http://localhost:5183/ProductCatalogue");
await page.waitForTimeout(1000);
const row = page.locator('tr:has-text("Basic Wash (Saloon)")');
await row.locator('td').last().locator('button').first().click();
await page.waitForTimeout(500);
const priceInput = page.locator('[role="dialog"] input[type="number"]').nth(1);
await priceInput.fill("999");
await page.click('button:has-text("Save Changes")');
await page.waitForTimeout(1000);

const catalogueText = await page.textContent("body");
console.log("Catalogue shows updated price 999:", catalogueText.includes("KES 999"));

// 2. Go straight to check-in and see if it reflects 999 or stale 300
await page.goto("http://localhost:5183/Washes");
await page.waitForTimeout(1000);
await page.click('button:has-text("Check-In Vehicle")');
await page.waitForTimeout(500);
await page.click('button:has-text("Next: Select Services")');
await page.waitForTimeout(500);

const checkinText = await page.textContent("body");
console.log("Check-in shows NEW price (999):", /Basic Wash \(Saloon\)[\s\S]{0,50}KES 999/.test(checkinText));
console.log("Check-in shows STALE price (300):", /Basic Wash \(Saloon\)[\s\S]{0,50}KES 300/.test(checkinText));

await page.screenshot({ path: "scripts/smoke-priceupdate.png", fullPage: true });

// Revert the price back to 300 for cleanliness
await page.goto("http://localhost:5183/ProductCatalogue");
await page.waitForTimeout(1000);
const row2 = page.locator('tr:has-text("Basic Wash (Saloon)")');
await row2.locator('td').last().locator('button').first().click();
await page.waitForTimeout(500);
const priceInput2 = page.locator('[role="dialog"] input[type="number"]').nth(1);
await priceInput2.fill("300");
await page.click('button:has-text("Save Changes")');
await page.waitForTimeout(500);

console.log("\nErrors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
await browser.close();
