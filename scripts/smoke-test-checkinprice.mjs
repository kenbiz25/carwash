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

await page.goto("http://localhost:5183/Washes");
await page.waitForTimeout(1000);
await page.click('button:has-text("Check-In Vehicle")');
await page.waitForTimeout(500);
await page.fill('input[placeholder="KAA 123B"]', "KTS111Z");
await page.click('button:has-text("Next: Select Services")');
await page.waitForTimeout(500);

const bodyText = await page.textContent("body");
console.log("Shows Basic Wash (Saloon) price:", /Basic Wash \(Saloon\)[\s\S]{0,50}KES 300/.test(bodyText));
console.log("Shows Tyre Shiner price:", /Tyre Shiner[\s\S]{0,50}KES 100/.test(bodyText));

// Select two services
await page.click('div:has-text("Basic Wash (Saloon)")', { position: { x: 10, y: 10 } }).catch(() => {});
const basicWashCard = page.locator('div.rounded-xl.border-2:has-text("Basic Wash (Saloon)")').first();
await basicWashCard.click();
await page.waitForTimeout(300);

const tyreShinerCard = page.locator('div.rounded-xl.border-2:has-text("Tyre Shiner")').first();
await tyreShinerCard.click();
await page.waitForTimeout(300);

const totalText = await page.locator('text=/^KES [\\d,]+$/').last().textContent().catch(() => null);
const bodyText2 = await page.textContent("body");
const totalMatch = bodyText2.match(/Total\s*KES ([\d,]+)/);
console.log("Total shown after selecting Basic Wash (300) + Tyre Shiner (100):", totalMatch ? totalMatch[1] : "NOT FOUND", "(expect 400)");

await page.screenshot({ path: "scripts/smoke-checkin-price.png", fullPage: true });

console.log("\nErrors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
await browser.close();
