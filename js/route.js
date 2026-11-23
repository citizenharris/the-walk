// Geometry helpers over the route GeoJSON. Coordinates come in as [lng, lat]
// and leave as [lat, lng] to match Leaflet.

const R = 6371000;

export function haversine([lat1, lng1], [lat2, lng2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function cumulative(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + haversine(points[i - 1], points[i]));
  return out;
}

// Searches forward from `from` only, so a stop can't latch onto an earlier
// stretch of the route that happens to pass nearby.
export function nearestIndex(points, target, from = 0) {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < points.length; i++) {
    const d = haversine(points[i], target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export async function loadRoute(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Route failed to load: ${res.status}`);
  const geo = await res.json();
  const byId = Object.fromEntries(geo.features.map((f) => [f.properties.id, f]));
  const toLatLng = (f) => f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const main = toLatLng(byId.main);
  const detour = toLatLng(byId.detour);
  return { main, mainCum: cumulative(main), detour, detourLength: cumulative(detour).at(-1) };
}
