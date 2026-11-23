import { test, expect } from "@playwright/test";

const idx = (page, id) => page.evaluate((id) => window.theWalk.pageIds.indexOf(id), id);
const current = (page) => page.evaluate(() => window.theWalk.index);
const walked = (page) => page.evaluate(() => window.theWalk.walkedPoints());
const center = (page) => page.evaluate(() => window.theWalk.center());

async function open(page, { layout, lang = "en", hash = "" } = {}) {
  await page.addInitScript(
    ([layout, lang]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("walk.layout", layout);
      localStorage.setItem("walk.lang", lang);
    },
    [layout, lang],
  );
  await page.goto(`/${hash}`);
  await page.waitForFunction(() => window.theWalk);
}

// In the sheet layout the ► button moves on; in the split layout you scroll the next card to the reading line.
async function advance(page, layout) {
  const before = await current(page);
  if (layout === "sheet") {
    await page.click(".nav-next");
  } else {
    const id = await page.evaluate((i) => window.theWalk.pageIds[i + 1], before);
    await page.locator(`#${id}`).evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight * 0.3));
  }
  await expect.poll(() => current(page)).toBe(before + 1);
}

for (const layout of ["sheet", "split"]) {
  test.describe(`${layout} layout`, () => {
    test("moving to the next stop moves the map and draws more of the route", async ({ page }) => {
      await open(page, { layout, hash: "#tate-modern" });
      expect(await current(page)).toBe(await idx(page, "tate-modern"));
      const routeBefore = await walked(page);
      await page.waitForTimeout(1200); // let the fly-to settle
      const centerBefore = await center(page);

      await advance(page, layout);
      await advance(page, layout);

      await expect.poll(() => walked(page)).toBeGreaterThan(routeBefore);
      await expect.poll(async () => Math.abs((await center(page)).lng - centerBefore.lng)).toBeGreaterThan(0.0005);
    });

    test("tapping a stop's pin makes that stop current and shows its card", async ({ page }) => {
      await open(page, { layout });
      await page.locator(".pin", { hasText: /^10$/ }).dispatchEvent("click");
      await expect.poll(() => current(page)).toBe(await idx(page, "borough-market"));
      await expect(page.locator("#borough-market")).toHaveClass(/current/);
      await expect(page.locator("#borough-market h2")).toBeInViewport();
    });

    test("switching language changes the text and is remembered", async ({ page }) => {
      await open(page, { layout, hash: "#covid-wall" });
      // innerText, because both languages are in the DOM and only the active one is rendered.
      const title = page.locator("#covid-wall h2");
      await expect(title).toHaveText("Covid Memorial Wall", { useInnerText: true });
      await page.click("#lang-toggle");
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
      await expect(title).toHaveText("Il muro della memoria del Covid", { useInnerText: true });
      await expect(page.locator("#covid-wall .page-body h3").first()).toHaveText("Da notare");
      await page.reload();
      await page.waitForFunction(() => window.theWalk);
      await expect(page.locator("html")).toHaveAttribute("lang", "it");
    });

    test("switching layout keeps the current stop and is remembered", async ({ page }) => {
      await open(page, { layout, hash: "#globe" });
      const globe = await idx(page, "globe");
      await page.click("#layout-toggle");
      const other = layout === "sheet" ? "split" : "sheet";
      await expect(page.locator("body")).toHaveClass(new RegExp(`layout-${other}`));
      await expect.poll(() => current(page)).toBe(globe);
      await expect(page.locator("#globe h2")).toBeInViewport();
      await page.reload();
      await page.waitForFunction(() => window.theWalk);
      expect(await page.evaluate(() => window.theWalk.layout)).toBe(other);
    });
  });
}

test("a link to a stop opens on that stop", async ({ page }) => {
  await open(page, { layout: "sheet", hash: "#hms-belfast" });
  expect(await current(page)).toBe(await idx(page, "hms-belfast"));
  await expect(page.locator("#hms-belfast h2")).toBeVisible();
  await expect(page.locator("#tate-modern h2")).toBeHidden();
});

test("the detour lights up its own line and doesn't advance the walked route", async ({ page }) => {
  await open(page, { layout: "sheet", hash: "#london-eye" });
  const atEye = await walked(page);
  await page.click(".nav-next");
  await expect.poll(() => current(page)).toBe(await idx(page, "leake-street"));
  expect(await walked(page)).toBe(atEye);
  await expect(page.locator("#leake-street .step")).toContainText("there and back");
});

test("swiping the card left and right changes stop", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "swiping is a phone gesture");
  await open(page, { layout: "sheet", hash: "#globe" });
  const globe = await idx(page, "globe");
  const swipe = (dx) =>
    page.locator("#guide").evaluate((el, dx) => {
      const y = el.getBoundingClientRect().top + 60;
      const ev = (type, x) => el.dispatchEvent(new PointerEvent(type, { pointerType: "touch", clientX: x, clientY: y, bubbles: true }));
      ev("pointerdown", 200);
      ev("pointerup", 200 + dx);
    }, dx);
  await swipe(-120);
  await expect.poll(() => current(page)).toBe(globe + 1);
  await swipe(120);
  await expect.poll(() => current(page)).toBe(globe);
});

test("the full card opens and closes from the handle", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the laptop sheet is always open");
  await open(page, { layout: "sheet", hash: "#globe" });
  const handle = page.locator(".handle");
  const sheetHeight = () => page.locator("#guide").evaluate((el) => el.getBoundingClientRect().height);
  const peek = await sheetHeight();
  await expect(handle).toHaveAttribute("aria-expanded", "false");
  await handle.click();
  await expect(handle).toHaveAttribute("aria-expanded", "true");
  await expect.poll(sheetHeight).toBeGreaterThan(peek * 2);
  await handle.click();
  await expect(handle).toHaveAttribute("aria-expanded", "false");
  await expect.poll(sheetHeight).toBeCloseTo(peek, 0);
});
