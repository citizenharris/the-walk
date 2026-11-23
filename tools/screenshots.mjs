// Takes screenshots of key states for a visual check. Needs the site served on :4173
// (npm run serve). Usage: node tools/screenshots.mjs [outDir]

import { chromium, devices } from "@playwright/test";

const out = process.argv[2] ?? "screenshots";
const base = "http://localhost:4173/";
const browser = await chromium.launch();
const errors = [];

async function shot(name, ctxOpts, act = async () => {}) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} console: ${m.text()}`));
  await page.goto(base);
  await page.waitForFunction(() => window.theWalk);
  await act(page);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}

const goToId = (id) => (p) => p.evaluate((id) => window.theWalk.goTo(window.theWalk.pageIds.indexOf(id)), id);
const phone = devices["iPhone 13"];
const laptop = { viewport: { width: 1280, height: 800 } };

await shot("phone-sheet-intro", phone);
await shot("phone-sheet-tate", phone, goToId("tate-modern"));
await shot("phone-sheet-city", phone, goToId("city-view"));
await shot("phone-sheet-expanded", phone, async (p) => {
  await goToId("tate-modern")(p);
  await p.click(".handle");
});
await shot("phone-split", phone, async (p) => {
  await p.click("#layout-toggle");
  await goToId("millennium-bridge")(p);
});
await shot("laptop-sheet", laptop, goToId("tate-modern"));
await shot("laptop-split", laptop, async (p) => {
  await p.click("#layout-toggle");
  await goToId("london-bridge")(p);
});

console.log(errors.join("\n") || "no errors");
await browser.close();
