import { canonicalizeCity } from "./cityNormalizer";

export const HYDERABAD_PROPERTY_AREA = { latitude: 17.385, longitude: 78.4867, radiusKm: 100 };

// City-centre fallback only for legacy listings without a saved map pin.
// These are discovery estimates, never written into a property's coordinates.
const CITY_CENTRES: Record<string, [number, number]> = {
  hyderabad: [17.385, 78.4867],
  medchal: [17.6297, 78.4814],
  "medchal-malkajgiri": [17.6297, 78.4814],
  malkajgiri: [17.4474, 78.5262],
  "ranga reddy": [17.2557, 78.3889],
  rangareddy: [17.2557, 78.3889],
  shamshabad: [17.2512, 78.4377],
  sangareddy: [17.614, 78.0816],
  patancheru: [17.5328, 78.2646],
  ramachandrapuram: [17.5218, 78.3065],
  shadnagar: [17.068, 78.2038],
  vikarabad: [17.3381, 77.9049],
  chevella: [17.3067, 78.1353],
  bhongir: [17.5156, 78.8856],
  bhuvanagiri: [17.5156, 78.8856],
  yadadri: [17.589, 78.943],
  toopran: [17.849, 78.477],
  medak: [18.045, 78.263],
  zaheerabad: [17.681, 77.607],
};

export function isHyderabadDiscovery(city?: string | null): boolean {
  return canonicalizeCity(city) === "hyderabad";
}

export function withinHyderabadPropertyRadius(p: {
  city?: string | null; latitude?: number | string | null; longitude?: number | string | null;
}): boolean {
  const hasPin = p.latitude != null && p.longitude != null && p.latitude !== "" && p.longitude !== "";
  const point = hasPin
    ? [Number(p.latitude), Number(p.longitude)]
    : CITY_CENTRES[canonicalizeCity(p.city)];
  if (!point || !point.every(Number.isFinite)) return false;
  const [lat, lng] = point;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  const radians = (n: number) => n * Math.PI / 180;
  const { latitude, longitude, radiusKm } = HYDERABAD_PROPERTY_AREA;
  const a = Math.sin(radians(lat - latitude) / 2) ** 2
    + Math.cos(radians(latitude)) * Math.cos(radians(lat)) * Math.sin(radians(lng - longitude) / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return distance <= radiusKm;
}