/**
 * Corporate stay discovery helpers. A property is a corporate stay only when the
 * partner marked it (business type "corporate", corporate profile fields, or an
 * executive room). Categories are derived from saved partner data only.
 */
export const CORPORATE_TYPES = [
  { key: "business_hotel", label: "Business Hotels" },
  { key: "service_apt", label: "Service Apartments" },
  { key: "extended", label: "Extended Stays" },
  { key: "gst", label: "GST Invoice" },
  { key: "meeting", label: "Meeting Rooms" },
  { key: "airport", label: "Airport Transfer" },
  { key: "corporate_rates", label: "Corporate Rates" },
  { key: "flex_checkin", label: "Early / Late Check-in" },
] as const;

export type CorporateTypeKey = (typeof CORPORATE_TYPES)[number]["key"];

type HotelLike = { business_types?: string[] | null; type_details?: unknown; amenities?: string[] | null };
type RoomLike = { accommodation_kind?: string | null; amenities?: string[] | null; monthly_price?: number | null; stay_unit?: string | null; attributes?: Record<string, unknown> | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const details = (h: HotelLike) => (h.type_details && typeof h.type_details === "object" ? h.type_details : {}) as Record<string, unknown>;
const yes = (v: unknown) => v === true || norm(v) === "true" || norm(v) === "yes";

export function isCorporateProperty(hotel: HotelLike, rooms: RoomLike[] = []): boolean {
  const d = details(hotel);
  if ((hotel.business_types ?? []).map(norm).includes("corporate")) return true;
  if (yes(d.gst_invoice) || yes(d.business_center) || yes(d.corporate_rates) || Number(d.meeting_rooms) > 0) return true;
  return rooms.some((r) => norm(r.accommodation_kind) === "executive_room" || norm(r.attributes?.business_type) === "corporate");
}

export function corporateTypesOf(hotel: HotelLike, rooms: RoomLike[] = []): CorporateTypeKey[] {
  const out = new Set<CorporateTypeKey>();
  const d = details(hotel);
  const types = (hotel.business_types ?? []).map(norm);
  const kinds = rooms.map((r) => norm(r.accommodation_kind));
  const amen = [...(hotel.amenities ?? []), ...rooms.flatMap((r) => r.amenities ?? [])].map(norm).join(" | ");
  if (types.includes("hotel") || kinds.includes("executive_room")) out.add("business_hotel");
  if (types.includes("serviced_apartment") || kinds.includes("apartment")) out.add("service_apt");
  if (rooms.some((r) => Number(r.monthly_price) > 0 || norm(r.stay_unit) === "month")) out.add("extended");
  if (yes(d.gst_invoice) || rooms.some((r) => yes(r.attributes?.gst_invoice))) out.add("gst");
  if (Number(d.meeting_rooms) > 0 || yes(d.business_center) || /meeting|conference/.test(amen)) out.add("meeting");
  if (yes(d.airport_transfer) || /airport/.test(amen)) out.add("airport");
  if (yes(d.corporate_rates)) out.add("corporate_rates");
  if (yes(d.early_checkin)) out.add("flex_checkin");
  return [...out];
}

export function matchesCorporateTypes(hotel: HotelLike, rooms: RoomLike[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  const own = corporateTypesOf(hotel, rooms);
  return wanted.some((w) => own.includes(w as CorporateTypeKey));
}

export function countCorporateTypes(hotels: HotelLike[], roomsFor: (h: HotelLike) => RoomLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  hotels.forEach((h) => corporateTypesOf(h, roomsFor(h)).forEach((k) => { out[k] = (out[k] || 0) + 1; }));
  return out;
}
