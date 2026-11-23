import { t, getLang, setLang, initialLang, applyI18n, formatDistance, formatElapsed, formatHours } from "./i18n.js";
import { loadRoute, nearestIndex } from "./route.js";

const WALK_M_PER_MIN = 4000 / 60;
const DWELL_MIN = 5;
const LUNCH_MIN = 60;
const LUNCH_STOP = "borough-market";
const RED = "#c8312b";

const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wide = matchMedia("(min-width: 900px)");

const guide = document.getElementById("guide");
const sheetScroll = guide.querySelector(".sheet-scroll");
const pages = [...guide.querySelectorAll(".page")];
const prevBtn = guide.querySelector(".nav-prev");
const nextBtn = guide.querySelector(".nav-next");
const handle = guide.querySelector(".handle");
const posLabel = guide.querySelector(".pos");
const progressBar = document.querySelector(".progress-bar");
const progress = document.querySelector(".progress");
const announcer = document.getElementById("announce");
const toastEl = document.getElementById("toast");
const langBtn = document.getElementById("lang-toggle");
const layoutBtn = document.getElementById("layout-toggle");
const gpsBtn = document.getElementById("gps");

const state = { index: -1, layout: "sheet", expanded: false };

const latLngOf = (el) => (el.dataset.lat ? [Number(el.dataset.lat), Number(el.dataset.lng)] : null);
const acrossOf = (page) =>
  [...page.querySelectorAll("li[data-lat]")].map((li) => ({ name: li.dataset.name, at: latLngOf(li) }));
const titleOf = (page) => page.querySelector(`h2 [lang="${getLang()}"]`)?.textContent ?? page.querySelector("h2").textContent;

// ---------- map ----------

const map = L.map("map", { zoomControl: false }).setView([51.503, -0.105], 14);
L.control.zoom({ position: "topright" }).addTo(map);
L.maplibreGL({
  style: "https://tiles.openfreemap.org/styles/positron",
  attribution:
    '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Full-size pins overlap when the whole route is on screen.
const syncZoomClass = () => map.getContainer().classList.toggle("zoomed-out", map.getZoom() < 15);
map.on("zoomend", syncZoomClass);
syncZoomClass();

const route = await loadRoute("data/route.geojson");

L.polyline(route.main, { color: RED, weight: 4, opacity: 0.28, interactive: false }).addTo(map);
const walkedLine = L.polyline([], { color: RED, weight: 5, opacity: 0.95, interactive: false }).addTo(map);
const detourLine = L.polyline(route.detour, {
  color: RED,
  weight: 4,
  opacity: 0.4,
  dashArray: "1 9",
  lineCap: "round",
  interactive: false,
}).addTo(map);
const acrossLayer = L.layerGroup().addTo(map);

// ---------- timings ----------
// Each stop/detour page gets its position on the route and the numbers shown in its step line.

let mainIdx = 0;
let prevStop = null;
let stopsPassed = 0;
let lunchTaken = false;

for (const page of pages) {
  const kind = page.dataset.kind;
  const at = latLngOf(page);
  if (kind === "stop") {
    const idx = nearestIndex(route.main, at, mainIdx);
    const dist = prevStop ? route.mainCum[idx] - route.mainCum[prevStop.idx] : 0;
    const elapsed = route.mainCum[idx] / WALK_M_PER_MIN + DWELL_MIN * stopsPassed + (lunchTaken ? LUNCH_MIN : 0);
    page._walk = { idx, dist, minutes: dist / WALK_M_PER_MIN, elapsed, first: !prevStop };
    mainIdx = idx;
    if (prevStop) stopsPassed++;
    if (page.id === LUNCH_STOP) lunchTaken = true;
    prevStop = page._walk;
  } else if (kind === "detour") {
    const dist = route.detourLength * 2;
    page._walk = { idx: prevStop.idx, dist, minutes: dist / WALK_M_PER_MIN, detour: true };
  }
}

const totalMinutes = route.mainCum.at(-1) / WALK_M_PER_MIN + DWELL_MIN * stopsPassed + LUNCH_MIN;

function renderSteps() {
  for (const page of pages) {
    const w = page._walk;
    const step = page.querySelector(".step");
    if (!w || !step) continue;
    if (w.first) step.textContent = t("start");
    else if (w.detour) step.textContent = `${t("detour")} · +${Math.round(w.minutes + DWELL_MIN)} min · ${formatDistance(w.dist)} ${t("thereAndBack")}`;
    else step.textContent = `+${Math.round(w.minutes)} min · ${formatDistance(w.dist)} · ${formatElapsed(w.elapsed)} ${t("elapsed")}`;
  }
  for (const el of document.querySelectorAll('[data-fill="distance"]')) el.textContent = formatDistance(route.mainCum.at(-1));
  for (const el of document.querySelectorAll('[data-fill="duration"]')) el.textContent = t("aboutHours", { h: formatHours(totalMinutes) });
}

// ---------- markers ----------

const markers = new Map();
for (const [i, page] of pages.entries()) {
  if (!page._walk) continue;
  const marker = L.marker(latLngOf(page), {
    icon: L.divIcon({
      className: `pin${page._walk.detour ? " pin-detour" : ""}`,
      html: `<span>${page.dataset.label}</span>`,
      iconSize: [28, 28],
    }),
    keyboard: true,
    riseOnHover: true,
  }).addTo(map);
  marker.on("click", () => goTo(i));
  markers.set(i, marker);
}

function labelMarkers() {
  for (const [i, marker] of markers) {
    const el = marker.getElement();
    el?.setAttribute("aria-label", `${t("stopAnnounce")} ${pages[i].dataset.label}: ${titleOf(pages[i])}`);
    el?.setAttribute("role", "button");
  }
}

// ---------- map focus ----------

function cssPx(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

function mapPadding() {
  const p = 28;
  if (state.layout === "sheet") {
    if (wide.matches) return { paddingTopLeft: [guide.getBoundingClientRect().right + p, p], paddingBottomRight: [p, p] };
    return { paddingTopLeft: [p, p], paddingBottomRight: [p, cssPx("--peek") + p] };
  }
  return { paddingTopLeft: [p, p], paddingBottomRight: [p, p] };
}

function focusMap(page) {
  let bounds;
  if (page.dataset.kind === "intro") {
    bounds = L.latLngBounds([...route.main, ...route.detour]);
  } else {
    const points = [latLngOf(page), ...acrossOf(page).map((a) => a.at)].filter(Boolean);
    bounds = points.length === 1 ? L.latLng(points[0]).toBounds(320) : L.latLngBounds(points);
  }
  const opts = { ...mapPadding(), maxZoom: 17 };
  if (reduceMotion.matches) map.fitBounds(bounds, { ...opts, animate: false });
  else map.flyToBounds(bounds, { ...opts, duration: 0.9 });
}

function drawProgress(page) {
  const w = page._walk;
  const kind = page.dataset.kind;
  let upto = -1;
  if (kind === "outro") upto = route.main.length - 1;
  else if (w) upto = w.idx;
  walkedLine.setLatLngs(upto >= 0 ? route.main.slice(0, upto + 1) : []);
  detourLine.setStyle({ opacity: w?.detour ? 0.95 : 0.4 });

  const frac = upto >= 0 ? route.mainCum[upto] / route.mainCum.at(-1) : 0;
  progressBar.style.width = `${(frac * 100).toFixed(1)}%`;
  progress.setAttribute("aria-valuenow", String(Math.round(frac * 100)));

  for (const [i, marker] of markers) {
    const el = marker.getElement();
    if (!el) continue;
    const pw = pages[i]._walk;
    el.classList.toggle("current", i === state.index);
    el.classList.toggle("visited", upto >= 0 && !pw.detour && pw.idx <= upto && i !== state.index);
  }

  acrossLayer.clearLayers();
  const from = latLngOf(page);
  for (const { name, at } of acrossOf(page)) {
    if (from) L.polyline([from, at], { color: "#444", weight: 1.5, dashArray: "4 6", interactive: false }).addTo(acrossLayer);
    L.circleMarker(at, { radius: 5, color: "#444", weight: 1.5, fillColor: "#fff", fillOpacity: 1 })
      .bindTooltip(name, { permanent: true, direction: "top", offset: [0, -6], className: "across-label" })
      .addTo(acrossLayer);
  }
}

// ---------- navigation ----------

let programmaticScroll = false;
let programmaticTimer;

function goTo(i, { scroll = true, force = false } = {}) {
  i = Math.max(0, Math.min(pages.length - 1, i));
  if (i === state.index && !force) return;
  state.index = i;
  const page = pages[i];

  pages.forEach((p, k) => p.classList.toggle("current", k === i));
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === pages.length - 1;
  posLabel.textContent = `${i + 1} / ${pages.length}`;
  history.replaceState(null, "", `#${page.id}`);
  announcer.textContent = page.dataset.label ? `${t("stopAnnounce")} ${page.dataset.label}: ${titleOf(page)}` : titleOf(page);

  drawProgress(page);

  if (state.layout === "sheet") {
    sheetScroll.scrollTop = 0;
  } else if (scroll) {
    programmaticScroll = true;
    clearTimeout(programmaticTimer);
    page.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    programmaticTimer = setTimeout(() => (programmaticScroll = false), 1000);
  }
  focusMap(page);
}

prevBtn.addEventListener("click", () => goTo(state.index - 1));
nextBtn.addEventListener("click", () => goTo(state.index + 1));

document.addEventListener("keydown", (e) => {
  if (state.layout !== "sheet" || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest?.("input, textarea, #map")) return;
  if (e.key === "ArrowRight") goTo(state.index + 1);
  else if (e.key === "ArrowLeft") goTo(state.index - 1);
});

// ---------- sheet: expand and swipe ----------

function setExpanded(on) {
  state.expanded = on;
  guide.classList.toggle("expanded", on);
  handle.setAttribute("aria-expanded", String(on));
  handle.dataset.i18nAria = on ? "collapse" : "expand";
  handle.setAttribute("aria-label", t(handle.dataset.i18nAria));
  if (!on) sheetScroll.scrollTop = 0;
}

handle.addEventListener("click", () => setExpanded(!state.expanded));

let swipe = null;
guide.addEventListener("pointerdown", (e) => {
  if (state.layout !== "sheet" || wide.matches || e.pointerType === "mouse") return;
  swipe = { x: e.clientX, y: e.clientY };
});
guide.addEventListener("pointercancel", () => (swipe = null));
guide.addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > 1.3 * Math.abs(dy)) {
    goTo(state.index + (dx < 0 ? 1 : -1));
  } else if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
    if (dy < 0 && !state.expanded) setExpanded(true);
    else if (dy > 0 && state.expanded && sheetScroll.scrollTop <= 0) setExpanded(false);
  }
});

// ---------- split layout: the card crossing the reading line is current ----------

function readingLine() {
  const mapRect = document.getElementById("map").getBoundingClientRect();
  return wide.matches ? innerHeight * 0.35 : mapRect.bottom + 80;
}

let scrollQueued = false;
addEventListener(
  "scroll",
  () => {
    if (state.layout !== "split") return;
    if (programmaticScroll) {
      clearTimeout(programmaticTimer);
      programmaticTimer = setTimeout(() => (programmaticScroll = false), 150);
      return;
    }
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const y = readingLine();
      const i = pages.findIndex((p) => {
        const r = p.getBoundingClientRect();
        return r.top <= y && r.bottom > y;
      });
      if (i >= 0) goTo(i, { scroll: false });
    });
  },
  { passive: true },
);

// ---------- layout switch ----------

function setLayout(layout) {
  state.layout = layout === "split" ? "split" : "sheet";
  document.body.classList.toggle("layout-sheet", state.layout === "sheet");
  document.body.classList.toggle("layout-split", state.layout === "split");
  layoutBtn.dataset.i18nAria = state.layout === "sheet" ? "toSplit" : "toSheet";
  layoutBtn.setAttribute("aria-label", t(layoutBtn.dataset.i18nAria));
  layoutBtn.dataset.layout = state.layout;
  store.set("walk.layout", state.layout);
  if (state.layout === "split") setExpanded(false);
  map.invalidateSize();
  if (state.index >= 0) goTo(state.index, { force: true });
}

layoutBtn.addEventListener("click", () => setLayout(state.layout === "sheet" ? "split" : "sheet"));
wide.addEventListener("change", () => {
  map.invalidateSize();
  goTo(state.index, { force: true, scroll: false });
});

// ---------- language ----------

function renderLang() {
  applyI18n();
  langBtn.textContent = t("langButton");
  renderSteps();
  labelMarkers();
}

langBtn.addEventListener("click", () => {
  setLang(getLang() === "en" ? "it" : "en");
  renderLang();
});

// ---------- GPS ----------

let watchId = null;
let gpsDot = null;
let gpsRing = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 4000);
}

function stopGps() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  gpsDot?.remove();
  gpsRing?.remove();
  gpsDot = gpsRing = null;
  gpsBtn.setAttribute("aria-pressed", "false");
  gpsBtn.dataset.i18nAria = "gpsOn";
  gpsBtn.setAttribute("aria-label", t("gpsOn"));
}

gpsBtn.addEventListener("click", () => {
  if (watchId !== null) return stopGps();
  if (!("geolocation" in navigator)) return toast(t("gpsUnsupported"));
  let first = true;
  gpsBtn.setAttribute("aria-pressed", "true");
  gpsBtn.dataset.i18nAria = "gpsOff";
  gpsBtn.setAttribute("aria-label", t("gpsOff"));
  watchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      const at = [coords.latitude, coords.longitude];
      if (!gpsDot) {
        gpsRing = L.circle(at, { radius: coords.accuracy, color: "#1a73e8", weight: 1, fillOpacity: 0.1, interactive: false }).addTo(map);
        gpsDot = L.circleMarker(at, { radius: 7, color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1, interactive: false }).addTo(map);
      } else {
        gpsDot.setLatLng(at);
        gpsRing.setLatLng(at).setRadius(coords.accuracy);
      }
      // Pan once so the dot is visible; after that the map is left alone.
      if (first) map.panTo(at, { animate: !reduceMotion.matches });
      first = false;
    },
    () => {
      toast(t("gpsError"));
      stopGps();
    },
    { enableHighAccuracy: true, maximumAge: 10000 },
  );
});

// ---------- start ----------

setLang(initialLang());
renderLang();
setLayout(store.get("walk.layout") ?? "sheet");
const fromHash = pages.findIndex((p) => `#${p.id}` === location.hash);
goTo(fromHash >= 0 ? fromHash : 0, { force: true });
document.body.classList.add("ready");

// Read-only handle for the Playwright tests.
window.theWalk = {
  get index() {
    return state.index;
  },
  get layout() {
    return state.layout;
  },
  get pageIds() {
    return pages.map((p) => p.id);
  },
  walkedPoints: () => walkedLine.getLatLngs().length,
  center: () => map.getCenter(),
  goTo: (i) => goTo(i),
};
