/**
 * Luxury stay discovery helpers. A property is a luxury stay only when the
 * partner said so: "luxury" business type, a saved luxury tier, a luxury suite
 * room, or "luxury" resort category. Categories come from saved partner data.
 */
export const LUXURY_TYPES = [
  { key: "villa", label: "Luxury Villas", sub: "Private, spacious villas" },
  { key: "beachfront", label: "Beachfront Resorts", sub: "Stays by the sea" },
  { key: "hill", label: "Hill Retreats", sub: "Scenic and peaceful" },
  { key: "boutique", label: "Boutique Hotels", sub: "Unique and stylish" },
  { key: "heritage", label: "Heritage Properties", sub: "Royal experiences" },
  { key: "private_pool", label: "Private Pool Stays", sub: "Ultimate privacy" },
  { key: "service_apt", label: "Luxury Service Apts", sub: "Premium furnished" },
  { key: "suite", label: "Luxury Suites", sub: "Suites & penthouses" },
] as const;

export type LuxuryTypeKey = (typeof LUXURY_TYPES)[number]["key"];

type HotelLike = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null; property_type?: string | null };
type RoomLike = { room_name?: string | null; room_type?: string | null; accommodation_kind?: string | null; amenities?: string[] | null; attributes?: Record<string, unknown> | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const details = (h: HotelLike) => (h.type_details && typeof h.type_details === "object" ? h.type_details : {}) as Record<string, unknown>;
const list = (v: unknown) => (Array.isArray(v) ? v.map(norm) : []);

export function isLuxuryProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  const d = details(hotel);
  if ((hotel.business_types ?? []).map(norm).includes("luxury")) return true;
  if (norm(d.luxury_tier)) return true;
  if (list(d.resort_types).includes("luxury")) return true;
  return rooms.some((r) => norm(r.accommodation_kind) === "luxury_suite" || norm(r.attributes?.business_type) === "luxury");
}

export function luxuryTypesOf(hotel: HotelLike, rooms: RoomLike[] = []): LuxuryTypeKey[] {
  const out = new Set<LuxuryTypeKey>();
  const d = details(hotel);
  const types = (hotel.business_types ?? []).map(norm);
  const kinds = rooms.map((r) => norm(r.accommodation_kind));
  const resortTypes = list(d.resort_types);
  const amen = [...(hotel.amenities ?? []), ...rooms.flatMap((r) => r.amenities ?? [])].map(norm).join(" | ");
  if (types.includes("villa") || kinds.includes("villa")) out.add("villa");
  if (resortTypes.includes("beach") || /beach ?front|beach access|private beach/.test(amen)) out.add("beachfront");
  if (resortTypes.includes("hill")) out.add("hill");
  if (types.includes("boutique")) out.add("boutique");
  if (resortTypes.includes("heritage") || types.includes("heritage")) out.add("heritage");
  if (rooms.some((r) => r.attributes?.private_pool === true) || /private pool|plunge pool/.test(amen)) out.add("private_pool");
  if (types.includes("serviced_apartment") || kinds.includes("apartment")) out.add("service_apt");
  if (kinds.includes("luxury_suite")) out.add("suite");
  return [...out];
}

export function matchesLuxuryTypes(hotel: HotelLike, rooms: RoomLike[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = luxuryTypesOf(hotel, rooms);
  return wanted.some((w) => own.includes(w as LuxuryTypeKey));
}

export function countLuxuryTypes(hotels: HotelLike[], roomsFor: (h: HotelLike) => RoomLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => luxuryTypesOf(h, roomsFor(h)).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}
