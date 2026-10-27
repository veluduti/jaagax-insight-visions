/**
 * Unique stay discovery helpers (villas, farm stays, homestays, boutique stays).
 * Eligibility and categories come only from partner-saved business types,
 * room kinds, profile fields and amenities.
 */
export const UNIQUE_BUSINESS_TYPES = ["villa", "farm_stay", "homestay", "boutique"];

export const UNIQUE_TYPES = [
  { key: "villa", label: "Villas", sub: "Private & spacious" },
  { key: "farm_stay", label: "Farm Stays", sub: "Close to nature" },
  { key: "homestay", label: "Homestays", sub: "Stay with locals" },
  { key: "boutique", label: "Boutique Stays", sub: "Unique & stylish" },
  { key: "glamping", label: "Tents & Cabins", sub: "Glamping & camping" },
  { key: "cottage", label: "Cottages", sub: "Cosy getaways" },
  { key: "entire_home", label: "Entire Homes", sub: "The whole place" },
  { key: "private_pool", label: "Private Pool", sub: "Your own pool" },
  { key: "pet", label: "Pet Friendly", sub: "Bring your pet" },
] as const;

export type UniqueTypeKey = (typeof UNIQUE_TYPES)[number]["key"];

type HotelLike = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null };
type RoomLike = { accommodation_kind?: string | null; amenities?: string[] | null; attributes?: Record<string, unknown> | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const details = (h: HotelLike) => (h.type_details && typeof h.type_details === "object" ? h.type_details : {}) as Record<string, unknown>;
const yes = (v: unknown) => v === true || norm(v) === "true" || norm(v) === "yes";

export function isUniqueProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  if ((hotel.business_types ?? []).map(norm).some((t) => UNIQUE_BUSINESS_TYPES.includes(t))) return true;
  return rooms.some((r) => UNIQUE_BUSINESS_TYPES.includes(norm(r.attributes?.business_type)));
}

export function uniqueTypesOf(hotel: HotelLike, rooms: RoomLike[] = []): UniqueTypeKey[] {
  const out = new Set<UniqueTypeKey>();
  const d = details(hotel);
  const types = [...(hotel.business_types ?? []), ...rooms.map((r) => r.attributes?.business_type)].map(norm);
  const kinds = rooms.map((r) => norm(r.accommodation_kind));
  const amen = [...(hotel.amenities ?? []), ...rooms.flatMap((r) => r.amenities ?? [])].map(norm).join(" | ");
  for (const t of ["villa", "farm_stay", "homestay", "boutique"] as const) if (types.includes(t)) out.add(t);
  if (kinds.includes("villa")) out.add("villa");
  if (kinds.includes("tent") || kinds.includes("cabin")) out.add("glamping");
  if (kinds.includes("cottage")) out.add("cottage");
  if (kinds.includes("entire_home")) out.add("entire_home");
  if (yes(d.private_pool) || rooms.some((r) => yes(r.attributes?.private_pool)) || /private pool|plunge pool/.test(amen)) out.add("private_pool");
  if (yes(d.pets) || /pet/.test(amen)) out.add("pet");
  return [...out];
}

export function matchesUniqueTypes(hotel: HotelLike, rooms: RoomLike[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = uniqueTypesOf(hotel, rooms);
  return wanted.some((w) => own.includes(w as UniqueTypeKey));
}

export function countUniqueTypes(hotels: HotelLike[], roomsFor: (h: HotelLike) => RoomLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => uniqueTypesOf(h, roomsFor(h)).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}
