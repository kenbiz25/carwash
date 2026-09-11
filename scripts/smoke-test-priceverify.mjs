import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:5183/Login");
await page.waitForSelector("input#email", { timeout: 15000 });
await page.fill("input#email", "kenbiz25+owner@gmail.com");
await page.fill("input#password", process.env.SEED_OWNER_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/Dashboard/, { timeout: 15000 });

// Set price to a unique unmistakable value
await page.goto("http://localhost:5183/ProductCatalogue");
await page.waitForTimeout(1000);
await page.locator('tr:has-text("Basic Wash (Saloon)")').locator('td').last().locator('button').first().click();
await page.waitForTimeout(500);
await page.locator('[role="dialog"] input[type="number"]').nth(1).fill("777");
await page.click('button:has-text("Save Changes")');
await page.waitForTimeout(1000);

await page.goto("http://localhost:5183/Washes");
await page.waitForTimeout(1000);
await page.click('button:has-text("Check-In Vehicle")');
await page.waitForTimeout(500);
await page.click('button:has-text("Next: Select Services")');
await page.waitForTimeout(500);

const card = page.locator('div.rounded-xl.border-2:has-text("Basic Wash (Saloon)")').first();
const cardText = await card.textContent();
console.log("Basic Wash (Saloon) card text in check-in:", cardText.trim());

// Revert
await page.goto("http://localhost:5183/ProductCatalogue");
await page.waitForTimeout(1000);
await page.locator('tr:has-text("Basic Wash (Saloon)")').locator('td').last().locator('button').first().click();
await page.waitForTimeout(500);
await page.locator('[role="dialog"] input[type="number"]').nth(1).fill("300");
await page.click('button:has-text("Save Changes")');
await page.waitForTimeout(500);

await browser.close();
