import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/Login");
await page.waitForSelector('input#email', { timeout: 15000 });
await page.fill('input#email', 'kenbiz25+manager@gmail.com');
await page.fill('input#password', 'manager123');
await page.click('button[type="submit"]');

await page.waitForURL(/Dashboard/, { timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "scripts/smoke-manager.png", fullPage: false });

const sidebarText = await page.textContent("aside");
console.log("Role badge visible:", sidebarText.includes("Manager"));
console.log("Has Settings link (should be false, owner-only):", sidebarText.includes("Settings & Users"));
console.log("Has Job Orders link:", sidebarText.includes("Job Orders"));
console.log("\nConsole/page errors:", errors.length ? "\n- " + errors.join("\n- ") : "none");

await browser.close();
process.exit(errors.length ? 1 : 0);
