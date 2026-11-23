# The Walk

Our walk along the South Bank, from Vauxhall to the Dickens Inn at St Katharine Docks, as an interactive guide for
friends and family. It's in English and Italian, and you can view it as a full-screen map with a swipeable card or as a
map above a scrolling list.

Live at <https://citizenharris.github.io/the-walk/>. See [SPEC.md](SPEC.md) for the design decisions.

## Editing

Everything a visitor reads is in `index.html`. There's no build step: edit the file, commit and push, and GitHub Pages
publishes it within a minute or two.

Each stop is a `<section class="page">`:

```html
<section class="page" data-kind="stop" id="globe" data-label="7" data-lat="51.5083" data-lng="-0.0970">
```

- `data-lat`/`data-lng` place the pin. The distance and time from the previous stop are worked out from the route, so
  moving a pin changes them.
- Text comes in pairs: `<p lang="en">…</p>` followed by `<p lang="it">…</p>`. The tests fail if one half of a pair is missing.
- `<li data-name="…" data-lat="…" data-lng="…">` inside `.across` draws a dashed sightline to that sight, labelled with `data-name`.

### Adding a personal note

Notes are optional and don't appear unless you add one. Put this inside a stop's `.page-body`:

```html
<div class="note">
  <h3 data-i18n="ourNote"></h3>
  <p lang="en">Last time, my brother bought three kinds of cheese here and ate none of them.</p>
  <p lang="it">L'ultima volta mio fratello ha comprato tre tipi di formaggio e non ne ha mangiato nessuno.</p>
</div>
```

### Swapping in your own photos

Replace `images/<stop-id>.jpg` with your own photo, landscape and about 1200 px wide, then delete that stop's entry from
`images/credits.json` so it no longer carries a Commons credit. To resize a photo:

```sh
sips -s format jpeg -s formatOptions 75 -Z 1200 my-photo.HEIC --out images/globe.jpg
```

### Changing the route

The red line is `data/route.geojson`, generated from OpenStreetMap walking directions. To change it, edit the waypoints
in `tools/build-route.mjs`, then:

```sh
npm run route
```

Waypoints should sit on the path you actually walk, not on the landmark. A waypoint on a bridge deck or forecourt draws
an out-and-back spike.

## Running it locally

```sh
npm install
npx playwright install chromium webkit
npm run serve        # http://localhost:4173
```

## Tests

```sh
npm test
```

These are Playwright tests on an iPhone-sized WebKit and a laptop-sized Chromium. They check moving between stops, the
route line, pin taps, the language and layout switches in both layouts, and that every stop has coordinates and text in
both languages. They need an internet connection, because the map libraries and tiles come from CDNs.

To check how it looks, run `node tools/screenshots.mjs <dir>` while `npm run serve` is running.

## Credits

The base map is [OpenFreeMap](https://openfreemap.org) © [OpenMapTiles](https://www.openmaptiles.org/), with data from ©
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Map code is by [Leaflet](https://leafletjs.com)
and [MapLibre](https://maplibre.org). Routing is by [OSRM](https://project-osrm.org) on the FOSSGIS server. Photos come
from Wikimedia Commons, credited on each card.
