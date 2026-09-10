import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/Login");
await page.waitForSelector("input#email", { timeout: 15000 });
await page.fill("input#email", "kenbiz25+owner@gmail.com");
await page.fill("input#password", "owner123");
await page.click('button[type="submit"]');
await page.waitForURL(/Dashboard/, { timeout: 15000 });

await page.goto("http://localhost:5183/Washes");
await page.waitForTimeout(1000);
await page.click('button:has-text("Check-In Vehicle")');
await page.waitForTimeout(500);
await page.click('button:has-text("Next: Select Services")');
await page.waitForTimeout(500);

const bodyText = await page.textContent("body");
console.log("Shows Exterior Wash category:", bodyText.includes("Exterior Wash"));
console.log("Shows Interior Clean category:", bodyText.includes("Interior Clean"));
console.log("Shows Detailing category:", bodyText.includes("Detailing"));
console.log("Shows Mechanical category:", bodyText.includes("Mechanical"));
console.log("Shows Add-Ons category:", bodyText.includes("Add-Ons"));
console.log("Shows Public Matatus service:", bodyText.includes("Public Matatus"));
console.log("Shows Big Lorries service:", bodyText.includes("Big Lorries"));

const serviceCount = await page.locator('div[class*="rounded-xl border-2 cursor-pointer"]').count();
console.log("Total selectable service cards:", serviceCount, "(expect 42)");

const tyreShinerSaloon = (await page.locator('div:has-text("Tyre Shiner")').first().textContent()).trim();
console.log("Tyre Shiner @ saloon (default):", tyreShinerSaloon);

// Go back to Details tab and switch vehicle type to SUV
await page.click('[role="tab"]:has-text("Details")');
await page.waitForTimeout(300);
await page.locator('button[role="combobox"]').first().click();
await page.waitForTimeout(300);
await page.click('[role="option"]:has-text("SUV")');
await page.waitForTimeout(300);
await page.click('[role="tab"]:has-text("Services")');
await page.waitForTimeout(500);

const tyreShinerSuv = (await page.locator('div:has-text("Tyre Shiner")').first().textContent()).trim();
console.log("Tyre Shiner @ SUV:", tyreShinerSuv, "(expect KES 200)");

const basicWashSuv = (await page.locator('div:has-text("Basic Wash (SUV)")').first().textContent()).trim();
console.log("Basic Wash (SUV) card:", basicWashSuv);

await page.screenshot({ path: "scripts/smoke-checkin-services.png", fullPage: true });

console.log("\nErrors:", errors.length ? "\n- " + errors.filter(e => !e.includes("validateDOMNesting")).join("\n- ") : "none (ignoring pre-existing DOM nesting warning)");
await browser.close();
