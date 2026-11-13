// Builds the data shown in the room-details popup from whatever the room record
// actually carries (native hotel_rooms row, or HyperGuest static + live room).
// Every helper drops empty/zero values so absent data is never displayed.

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

export interface RoomDetails {
  name: string;
  photos: string[];
  specs: { label: string; value: string }[];
  description: string | null;
  amenities: string[];
  meals: { label: string; value: string }[];
  policies: string[];
}

export const hasRoomDetails = (d: RoomDetails | null | undefined) =>
  !!d && (d.photos.length > 0 || d.specs.length > 0 || !!d.description || d.amenities.length > 0 || d.meals.length > 0 || d.policies.length > 0);

/** Amenities arrive as a string array, an object map, or JSONB from older rows. */
export function amenityNames(amenities: any): string[] {
  const out: string[] = [];
  if (Array.isArray(amenities)) {
    for (const a of amenities) {
      const label = typeof a === "string" ? text(a) : text(a?.name) ?? text(a?.label) ?? text(a?.title);
      if (label) out.push(label);
    }
  } else if (amenities && typeof amenities === "object") {
    for (const [key, value] of Object.entries(amenities)) {
      if (value === false || value == null) continue;
      const label = typeof value === "string" ? text(value) : text(key);
      if (label) out.push(label);
    }
  }
  return Array.from(new Set(out));
}

const humanize = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Native JaagaX partner room (hotel_rooms row). */
export function nativeRoomDetails(
  room: any,
  meals: { meal_type: string; pricing_mode: string; adult_price: number }[] = [],
): RoomDetails {
  const specs: { label: string; value: string }[] = [];
  const size = num(room?.size_sqft);
  if (size) specs.push({ label: "Size", value: `${size.toLocaleString("en-IN")} sq ft` });
  const bed = text(room?.bed_type);
  if (bed) specs.push({ label: "Bed", value: bed });
  const sleeps = num(room?.max_occupancy);
  if (sleeps) specs.push({ label: "Sleeps", value: `${sleeps} guest${sleeps > 1 ? "s" : ""}` });
  const view = text(room?.view_type);
  if (view) specs.push({ label: "View", value: view });
  const category = text(room?.category);
  if (category) specs.push({ label: "Category", value: category });

  const mealsOut = (Array.isArray(meals) ? meals : []).flatMap((m) => {
    const label = text(m?.meal_type);
    if (!label) return [];
    const value = m.pricing_mode === "included"
      ? "Included"
      : `₹${Number(m.adult_price || 0).toLocaleString("en-IN")}/adult`;
    return [{ label: humanize(label), value }];
  });

  const policies: string[] = [];
  const cancel = text(room?.cancellation_policy);
  if (cancel) policies.push(`Cancellation: ${cancel}`);
  const minNights = num(room?.min_nights);
  if (minNights && minNights > 1) policies.push(`Minimum ${minNights} night${minNights > 1 ? "s" : ""}`);
  if (room?.extra_bed_allowed) {
    const price = num(room?.extra_bed_price);
    policies.push(`Extra bed allowed${price ? ` · ₹${price.toLocaleString("en-IN")} per night` : ""}`);
  }

  return {
    name: text(room?.room_type) ?? "Room",
    photos: (Array.isArray(room?.photos) ? room.photos : []).map((p: any) => text(p)).filter(Boolean) as string[],
    specs,
    description: text(room?.description),
    amenities: amenityNames(room?.amenities),
    meals: mealsOut,
    policies,
  };
}

/** HyperGuest supplier room: live availability merged with static content. */
export function hyperguestRoomDetails(staticRoom: any, liveRoom: any): RoomDetails {
  const settings = { ...(staticRoom?.settings ?? {}), ...(liveRoom?.settings ?? {}) };
  const specs: { label: string; value: string }[] = [];
  const size = num(settings?.roomSize);
  if (size) specs.push({ label: "Size", value: `${size} m²` });
  const beds = (Array.isArray(staticRoom?.beds) && staticRoom.beds.length ? staticRoom.beds : liveRoom?.settings?.beddingConfigurations) ?? [];
  const bedLine = beds
    .map((b: any) => `${num(b?.quantity) ?? 1} × ${text(b?.type) ?? text(b?.size) ?? "bed"}`)
    .join(", ");
  if (bedLine) specs.push({ label: "Bed", value: bedLine });
  const left = num(liveRoom?.numberOfAvailableRooms);
  if (left) specs.push({ label: "Rooms left", value: String(left) });
  for (const [label, key] of [
    ["Max guests", "maxOccupancy"],
    ["Adults", "adultsNumber"],
    ["Children", "childrenNumber"],
    ["Infants", "infantsNumber"],
    ["Bedrooms", "numberOfBedrooms"],
    ["Beds", "numberOfBeds"],
  ] as const) {
    const v = num(settings?.[key] ?? settings?.[key.replace(/^(adults|children|infants)Number$/, "max$1s")]);
    if (v) specs.push({ label, value: String(v) });
  }

  const photos = (Array.isArray(staticRoom?.images) ? staticRoom.images : [])
    .map((i: any) => text(i?.uri))
    .filter(Boolean) as string[];

  const descriptions = Array.isArray(staticRoom?.descriptions) ? staticRoom.descriptions : [];
  const desc = descriptions.find((d: any) => d?.language === "en_US" && d?.type === "general")
    ?? descriptions.find((d: any) => String(d?.language ?? "").startsWith("en"))
    ?? descriptions[0];

  return {
    name: text(liveRoom?.roomName) ?? text(staticRoom?.name) ?? "Room",
    photos,
    specs,
    description: text(desc?.description),
    amenities: amenityNames(staticRoom?.facilities ?? staticRoom?.amenities),
    meals: [],
    policies: [],
  };
}
