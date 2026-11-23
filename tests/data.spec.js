// Checks the content in index.html is complete, without running the app.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test.beforeEach(async ({ page }) => {
  // Static content only: block scripts so the app doesn't touch the DOM.
  await page.route("**/*.js", (route) => route.abort());
  await page.setContent(html);
});

test("every stop has a pin inside central London and a unique label", async ({ page }) => {
  const stops = await page.$$eval('.page[data-kind="stop"], .page[data-kind="detour"]', (els) =>
    els.map((el) => ({ id: el.id, label: el.dataset.label, lat: Number(el.dataset.lat), lng: Number(el.dataset.lng) })),
  );
  expect(stops.length).toBe(20);
  expect(new Set(stops.map((s) => s.label)).size).toBe(stops.length);
  for (const s of stops) {
    expect(s.lat, s.id).toBeGreaterThan(51.48);
    expect(s.lat, s.id).toBeLessThan(51.52);
    expect(s.lng, s.id).toBeGreaterThan(-0.13);
    expect(s.lng, s.id).toBeLessThan(-0.06);
  }
});

test("every English text has an Italian twin, and the other way round", async ({ page }) => {
  const unpaired = await page.$$eval("[lang='en'], [lang='it']", (els) =>
    els
      .filter((el) => el !== document.documentElement)
      .filter((el) => {
        const other = el.lang === "en" ? "it" : "en";
        const twin = el.lang === "en" ? el.nextElementSibling : el.previousElementSibling;
        return !(twin && twin.lang === other && twin.tagName === el.tagName && twin.textContent.trim());
      })
      .map((el) => `${el.closest("section")?.id}: ${el.textContent.trim().slice(0, 50)}`),
  );
  expect(unpaired).toEqual([]);
});

test("every photo has alt text in both languages", async ({ page }) => {
  const missing = await page.$$eval(".photo img", (imgs) =>
    imgs.filter((img) => !img.dataset.altEn || !img.dataset.altIt).map((img) => img.getAttribute("src")),
  );
  expect(missing).toEqual([]);
});

test("look-across and station items carry coordinates and a map label", async ({ page }) => {
  const bad = await page.$$eval(".across li, .stations li", (lis) =>
    lis.filter((li) => !li.dataset.name || Number.isNaN(Number(li.dataset.lat)) || Number.isNaN(Number(li.dataset.lng))).map((li) => li.textContent.trim().slice(0, 40)),
  );
  expect(bad).toEqual([]);
});
