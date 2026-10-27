/**
 * Service apartment discovery helpers. Categories are derived only from
 * partner-entered data: business types, room names/attributes, amenities,
 * star rating and monthly pricing. Nothing is invented.
 */
export const APARTMENT_TYPES = [
  { key: "1bhk", label: "1 BHK Apartments", sub: "For individuals" },
  { key: "2bhk", label: "2 BHK Apartments", sub: "For families" },
  { key: "3bhk", label: "3 BHK+ Apartments", sub: "For large groups" },
  { key: "studio", label: "Studio Apartments", sub: "Compact & budget" },
  { key: "luxury", label: "Luxury Service Apartments", sub: "Premium furnished stays" },
  { key: "corporate", label: "Corporate Apartments", sub: "For business travellers" },
  { key: "pet", label: "Pet Friendly Apartments", sub: "Pets allowed" },
  { key: "monthly", label: "Monthly Stay Apartments", sub: "Long term stays" },
] as const;

export type ApartmentTypeKey = (typeof APARTMENT_TYPES)[number]["key"];

type HotelLike = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null; star_rating?: number | null; property_type?: string | null };
type RoomLike = { room_name?: string | null; room_type?: string | null; accommodation_kind?: string | null; amenities?: string[] | null; monthly_price?: number | null; stay_unit?: string | null; attributes?: Record<string, unknown> | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

export function isApartmentProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  const types = (hotel.business_types ?? []).map(norm);
  if (types.some((t) => t === "serviced_apartment" || t === "service_apartment" || t.includes("apartment"))) return true;
  if (norm(hotel.property_type).includes("apartment")) return true;
  return rooms.some((r) => norm(r.attributes?.business_type) === "serviced_apartment" || norm(r.accommodation_kind) === "apartment");
}

export function apartmentTypesOf(hotel: HotelLike, rooms: RoomLike[] = []): ApartmentTypeKey[] {
  const out = new Set<ApartmentTypeKey>();
  const roomText = rooms.map((r) => `${norm(r.room_name)} ${norm(r.room_type)} ${norm(r.attributes?.bedrooms)}bhk`).join(" | ");
  if (/\bstudio\b/.test(roomText)) out.add("studio");
  if (/\b1\s*-?\s*bhk|\b1\s*bed/.test(roomText)) out.add("1bhk");
  if (/\b2\s*-?\s*bhk|\b2\s*bed/.test(roomText)) out.add("2bhk");
  if (/\b([3-9])\s*-?\s*bhk|\b([3-9])\s*bed|penthouse/.test(roomText)) out.add("3bhk");
  const amen = [...(hotel.amenities ?? []), ...rooms.flatMap((r) => r.amenities ?? [])].map(norm).join(" | ");
  if ((hotel.star_rating || 0) >= 4 || /luxury|premium/.test(roomText)) out.add("luxury");
  if (/business|work ?desk|workspace|meeting|corporate/.test(amen)) out.add("corporate");
  if (/pet/.test(amen)) out.add("pet");
  if (rooms.some((r) => Number(r.monthly_price) > 0 || norm(r.stay_unit) === "month")) out.add("monthly");
  return [...out];
}

/** Empty selection = all apartments; otherwise any selected category matches. */
export function matchesApartmentTypes(hotel: HotelLike, rooms: RoomLike[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = apartmentTypesOf(hotel, rooms);
  return wanted.some((w) => own.includes(w as ApartmentTypeKey));
}

export function countApartmentTypes(hotels: HotelLike[], roomsFor: (h: HotelLike) => RoomLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => apartmentTypesOf(h, roomsFor(h)).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}
