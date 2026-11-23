// Interface text only. Stop content lives in index.html as lang="en" / lang="it" pairs.

const STRINGS = {
  en: {
    switchLang: "Passa all'italiano",
    langButton: "IT",
    toSplit: "Switch to map-and-list view",
    toSheet: "Switch to full-map view",
    gpsOn: "Show where I am",
    gpsOff: "Stop showing where I am",
    gpsError: "Couldn't get your location. Check location permissions for this site.",
    gpsUnsupported: "This browser can't share your location.",
    prev: "Previous stop",
    next: "Next stop",
    expand: "Show the full card",
    collapse: "Shrink the card",
    map: "Map of the walk",
    lookFor: "Look for",
    across: "Look across",
    ourNote: "Our note",
    stepFree: "Step-free",
    officialSite: "Official site",
    checked: "checked Nov 2026",
    start: "Start here",
    detour: "detour",
    thereAndBack: "there and back",
    elapsed: "in",
    stopAnnounce: "Stop",
    photo: "Photo",
    aboutHours: "about {h} hours with lunch",
    km: "{n} km",
  },
  it: {
    switchLang: "Switch to English",
    langButton: "EN",
    toSplit: "Passa alla vista mappa e lista",
    toSheet: "Passa alla vista mappa intera",
    gpsOn: "Mostra dove sono",
    gpsOff: "Smetti di mostrare dove sono",
    gpsError: "Impossibile trovare la tua posizione. Controlla i permessi di localizzazione per questo sito.",
    gpsUnsupported: "Questo browser non può condividere la tua posizione.",
    prev: "Tappa precedente",
    next: "Tappa successiva",
    expand: "Mostra la scheda intera",
    collapse: "Riduci la scheda",
    map: "Mappa della passeggiata",
    lookFor: "Da notare",
    across: "Sull'altra sponda",
    ourNote: "Nota nostra",
    stepFree: "Senza gradini",
    officialSite: "Sito ufficiale",
    checked: "verificato a nov 2026",
    start: "Si parte da qui",
    detour: "deviazione",
    thereAndBack: "andata e ritorno",
    elapsed: "dall'inizio",
    stopAnnounce: "Tappa",
    photo: "Foto",
    aboutHours: "circa {h} ore, pranzo incluso",
    km: "{n} km",
  },
};

const STORAGE_KEY = "walk.lang";
let current = "en";

export function t(key, vars = {}) {
  const s = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function getLang() {
  return current;
}

export function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "it") return saved;
  } catch {}
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return prefs.some((l) => l?.toLowerCase().startsWith("it")) ? "it" : "en";
}

export function setLang(lang) {
  current = lang === "it" ? "it" : "en";
  document.documentElement.lang = current;
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {}
  applyI18n();
}

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  // An <img> can only carry one alt, so both languages sit in data attributes.
  for (const img of root.querySelectorAll("img[data-alt-en]")) {
    img.alt = img.dataset[current === "it" ? "altIt" : "altEn"] || img.dataset.altEn;
  }
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  const km = (m / 1000).toFixed(1);
  return `${current === "it" ? km.replace(".", ",") : km} km`;
}

export function formatElapsed(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function formatHours(min) {
  const quarters = Math.round(min / 15);
  const whole = Math.floor(quarters / 4);
  const frac = ["", "¼", "½", "¾"][quarters % 4];
  return `${whole}${frac}`;
}
