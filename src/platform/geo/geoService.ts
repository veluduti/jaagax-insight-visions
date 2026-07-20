/**
 * Geo / Maps Service Abstraction
 * ------------------------------
 * Small facade so modules don't hardwire Mapbox / Google. Land, hotel,
 * property, and future modules call the same methods.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends LatLng {
  label: string;
  raw?: unknown;
}

const MAPBOX_TOKEN =
  (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) ??
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined);

export async function geocode(query: string): Promise<GeocodeResult[]> {
  if (!MAPBOX_TOKEN) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${MAPBOX_TOKEN}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: Array<{ center: [number, number]; place_name: string }> };
  return (json.features ?? []).map((f) => ({
    lng: f.center[0],
    lat: f.center[1],
    label: f.place_name,
    raw: f,
  }));
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${point.lng},${point.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { features?: Array<{ center: [number, number]; place_name: string }> };
  const f = json.features?.[0];
  return f ? { lng: f.center[0], lat: f.center[1], label: f.place_name, raw: f } : null;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
