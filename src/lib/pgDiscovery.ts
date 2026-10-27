/**
 * PG / Hostel discovery helpers. Categories come only from partner-entered
 * data: business types, `type_details` (gender, etc.), room attributes,
 * room names and amenities. Nothing is invented.
 */
export const PG_TYPES = [
  { key: "boys", label: "Boys PG" },
  { key: "girls", label: "Girls PG" },
  { key: "coliving", label: "Co-living Spaces" },
  { key: "student", label: "Student Hostels" },
  { key: "professionals", label: "Working Professionals" },
  { key: "family", label: "Family PG" },
  { key: "short", label: "Short Stay Hostels" },
] as const;

export type PgTypeKey = (typeof PG_TYPES)[number]["key"];
type HotelLike = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null; name?: string | null; description?: string | null };
type RoomLike = { room_name?: string | null; accommodation_kind?: string | null; stay_unit?: string | null; attributes?: Record<string, unknown> | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const PG_KEYS = new Set(["pg", "hostel", "coliving", "co_living"]);

export function isPgProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  if ((hotel.business_types ?? []).some((t) => PG_KEYS.has(norm(t)))) return true;
  return rooms.some((r) => PG_KEYS.has(norm(r.attributes?.business_type)) || /^(pg_|hostel_|coliving_|dorm)/.test(norm(r.accommodation_kind)));
}

export function pgTypesOf(hotel: HotelLike, rooms: RoomLike[] = []): PgTypeKey[] {
  const out = new Set<PgTypeKey>();
  const d = (hotel.type_details || {}) as Record<string, unknown>;
  const genders = [d.gender, d.dorm_gender, ...rooms.map((r) => r.attributes?.gender)].map(norm);
  if (genders.some((g) => g === "boys" || g.includes("male only") && !g.includes("female"))) out.add("boys");
  if (genders.some((g) => g === "girls" || g.includes("female"))) out.add("girls");
  const types = (hotel.business_types ?? []).map(norm);
  if (types.includes("coliving") || types.includes("co_living") || rooms.some((r) => norm(r.accommodation_kind).startsWith("coliving"))) out.add("coliving");
  const text = `${norm(hotel.name)} ${norm(hotel.description)} ${rooms.map((r) => norm(r.room_name)).join(" ")} ${(hotel.amenities ?? []).map(norm).join(" ")}`;
  if (/student|college|study/.test(text)) out.add("student");
  if (/professional|working|office|it hub|workspace/.test(text)) out.add("professionals");
  if (/family/.test(text)) out.add("family");
  if (types.includes("hostel") && rooms.some((r) => ["night", "nightly", "day", ""].includes(norm(r.stay_unit)))) out.add("short");
  return [...out];
}

export function matchesPgTypes(hotel: HotelLike, rooms: RoomLike[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = pgTypesOf(hotel, rooms);
  return wanted.some((w) => own.includes(w as PgTypeKey));
}

export function countPgTypes(hotels: HotelLike[], roomsFor: (h: HotelLike) => RoomLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => pgTypesOf(h, roomsFor(h)).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}
