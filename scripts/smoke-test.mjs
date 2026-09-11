import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/Login");
await page.waitForSelector('input#email', { timeout: 15000 });
await page.fill('input#email', 'kenbiz25+owner@gmail.com');
await page.fill('input#password', process.env.SEED_OWNER_PASSWORD);
await page.click('button[type="submit"]');

await page.waitForURL(/Dashboard/, { timeout: 15000 });
await page.waitForTimeout(2500); // let queries settle
await page.screenshot({ path: "scripts/smoke-dashboard.png", fullPage: true });

const bodyText = await page.textContent("body");
console.log("URL after login:", page.url());
console.log("Contains 'BGO':", bodyText.includes("BGO"));
console.log("Contains a wash amount marker (Ksh):", bodyText.includes("Ksh") || bodyText.includes("KES"));
console.log("\nConsole/page errors:", errors.length ? "\n- " + errors.join("\n- ") : "none");

await browser.close();
process.exit(errors.length ? 1 : 0);
