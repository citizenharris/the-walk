// Generates data/route.geojson from OSRM's foot profile.
// Run with: node tools/build-route.mjs
// The waypoints are where we actually walk, not the landmarks themselves; extra
// "via" points keep the router on the riverside path instead of nearby streets.

import { writeFile } from "node:fs/promises";

const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

// [lat, lng, label]
const MAIN = [
  [51.48566, -0.12482, "Vauxhall station"],
  [51.4872, -0.1232, "via: Albert Embankment by SIS"],
  [51.4905, -0.1225, "via: Albert Embankment riverside"],
  [51.4950, -0.1212, "via: Lambeth Bridge south end"],
  [51.4990, -0.1203, "Covid Memorial Wall"],
  [51.5032, -0.1197, "London Eye"],
  [51.5055, -0.1185, "via: Hungerford Bridge"],
  [51.5070, -0.1163, "Southbank Centre"],
  [51.5082, -0.1080, "via: Oxo Tower wharf"],
  [51.5085, -0.1040, "via: Blackfriars Bridge underpass"],
  [51.5083, -0.0970, "Shakespeare's Globe"],
  [51.5071, -0.0905, "Golden Hinde"],
  [51.5060, -0.0900, "Southwark Cathedral"],
  [51.5054, -0.0907, "Borough Market"],
  [51.5066, -0.0866, "via: Queen's Walk under London Bridge"],
  [51.5059, -0.0838, "Hay's Galleria"],
  [51.5058, -0.0812, "HMS Belfast"],
  [51.5048, -0.0785, "Potters Fields"],
  [51.5055, -0.0754, "Tower Bridge"],
  [51.5066, -0.0726, "St Katharine Docks"],
  [51.50675, -0.07022, "Dickens Inn"],
];

const DETOUR = [
  [51.5032, -0.1197, "London Eye"],
  [51.50135, -0.11474, "Leake Street"],
];

async function route(points) {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&continue_straight=true`;
  const res = await fetch(url, { headers: { "User-Agent": "the-walk-guide/1.0 (personal static site)" } });
  if (!res.ok) throw new Error(`OSRM ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.code !== "Ok") throw new Error(`OSRM ${body.code}: ${body.message}`);
  const [r] = body.routes;
  const coordinates = r.geometry.coordinates.map(([lng, lat]) => [
    Math.round(lng * 1e5) / 1e5,
    Math.round(lat * 1e5) / 1e5,
  ]);
  return { coordinates, distance: Math.round(r.distance) };
}

const main = await route(MAIN);
const detour = await route(DETOUR);

const geojson = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { id: "main", distance: main.distance }, geometry: { type: "LineString", coordinates: main.coordinates } },
    { type: "Feature", properties: { id: "detour", distance: detour.distance }, geometry: { type: "LineString", coordinates: detour.coordinates } },
  ],
};

await writeFile(new URL("../data/route.geojson", import.meta.url), JSON.stringify(geojson) + "\n");
console.log(`main: ${main.distance} m, ${main.coordinates.length} points`);
console.log(`detour: ${detour.distance} m, ${detour.coordinates.length} points`);
