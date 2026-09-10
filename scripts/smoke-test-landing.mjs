import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto("http://localhost:5183/Landing");
await page.waitForSelector('text="Professional Car Care,"', { timeout: 15000 });

const bodyText = await page.textContent("body");
console.log("Hero shows new headline:", bodyText.includes("Professional Car Care"));
console.log("Hero shows Njiru badge:", bodyText.includes("Njiru, Nairobi"));
console.log("Has 'Book a Wash' CTA:", bodyText.includes("Book a Wash"));
console.log("Old SaaS copy gone (Sign Up Free):", !bodyText.includes("Sign Up Free"));
console.log("Old SaaS copy gone (500+ car wash owners):", !bodyText.includes("500+ car wash owners"));
console.log("Services section renamed:", bodyText.includes("Complete Vehicle Care Services"));
console.log("Shows real service names (Commercial & Fleet):", bodyText.includes("Commercial & Fleet Washing"));
console.log("New stats (3 Branches):", bodyText.includes("Branches in Nairobi"));
console.log("New testimonial (Susan Achieng):", bodyText.includes("Susan Achieng"));
console.log("Old testimonial gone (James Mwangi):", !bodyText.includes("James Mwangi"));
console.log("Brand belief quote:", bodyText.includes("Every car deserves the BGO shine"));
console.log("Final CTA customer-focused:", bodyText.includes("Ready for a Spotless Ride"));

// Font family check
const heroFont = await page.evaluate(() => {
  const h1 = document.querySelector("h1");
  return h1 ? getComputedStyle(h1).fontFamily : null;
});
console.log("\nH1 computed font-family:", heroFont);

const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
console.log("Body computed font-family:", bodyFont);

// Color check — brand-orange button background
const ctaBg = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("a,button")].find(el => el.textContent.includes("Book a Wash"));
  return btn ? getComputedStyle(btn).backgroundColor : null;
});
console.log("\n'Book a Wash' button background-color:", ctaBg, "(expect rgb(248, 52, 76) = #F8344C)");

await page.waitForTimeout(2000); // let map load
await page.evaluate(() => document.querySelector('[id="map"]')?.scrollIntoView());
await page.waitForTimeout(1000);
const mapPopupText = await page.textContent("body");
console.log("\nMap shows Njiru branch:", mapPopupText.includes("Our Locations"));

await page.screenshot({ path: "scripts/smoke-landing-hero.png" });
await page.locator("#map").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/smoke-landing-map.png" });
await page.locator("#services").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "scripts/smoke-landing-services.png" });

console.log("\nConsole errors:", errors.length ? "\n- " + errors.join("\n- ") : "none");
await browser.close();
process.exit(errors.length ? 1 : 0);
