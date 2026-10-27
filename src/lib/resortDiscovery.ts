/**
 * Resort discovery helpers. Resort categories are entered by partners in
 * `partner_hotels.type_details.resort_types` (Portfolio screen); a property
 * counts as a resort when its business types or any active room is a resort.
 */
export const RESORT_TYPES = [
  { key: "beach", label: "Beach Resort" },
  { key: "hill", label: "Hill Resort" },
  { key: "lake", label: "Lake Resort" },
  { key: "spa_wellness", label: "Spa & Wellness" },
  { key: "eco", label: "Eco Resort" },
  { key: "family", label: "Family Resort" },
  { key: "luxury", label: "Luxury Resort" },
  { key: "heritage", label: "Heritage Resort" },
  { key: "adventure", label: "Adventure Resort" },
] as const;

export type ResortTypeKey = (typeof RESORT_TYPES)[number]["key"];
const KEYS = new Set<string>(RESORT_TYPES.map((t) => t.key));

type HotelLike = { business_types?: string[] | null; type_details?: unknown };
type RoomLike = { attributes?: { business_type?: string } | null };

export function resortTypesOf(hotel: HotelLike): ResortTypeKey[] {
  const d = hotel.type_details as Record<string, unknown> | null | undefined;
  const raw = d && Array.isArray(d.resort_types) ? d.resort_types : [];
  return [...new Set(raw.map((v) => String(v).toLowerCase()).filter((v) => KEYS.has(v)))] as ResortTypeKey[];
}

export function isResortProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  const own = (hotel.business_types ?? []).some((t) => String(t).trim().toLowerCase() === "resort");
  return own || rooms.some((r) => String(r.attributes?.business_type || "").trim().toLowerCase() === "resort") || resortTypesOf(hotel).length > 0;
}

/** Empty selection means "all resorts"; otherwise any selected category matches. */
export function matchesResortTypes(hotel: HotelLike, wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = resortTypesOf(hotel);
  return wanted.some((w) => own.includes(w as ResortTypeKey));
}

export function countResortTypes(hotels: HotelLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => resortTypesOf(h).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}

const RECENT_KEY = "jaaga_recent_resorts";
export function readRecentResorts(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
export function pushRecentResort(id: string): string[] {
  const next = [id, ...readRecentResorts().filter((x) => x !== id)].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}
