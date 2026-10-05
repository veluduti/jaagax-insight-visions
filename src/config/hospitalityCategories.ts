/**
 * Single source of truth for Jaaga hospitality business categories.
 * Used by partner registration, partner dashboard menus, customer search,
 * AI intent parsing and recommendations.
 */
export type StayUnit = "room" | "bed" | "unit";
export type PartnerModule = "rooms" | "beds" | "units" | "meals" | "longstay" | "experiences";

export interface HospitalityCategory {
  key: string;
  label: string;
  emoji: string;
  modules: PartnerModule[];
  defaultUnit: StayUnit;
}

export const HOSPITALITY_CATEGORIES: HospitalityCategory[] = [
  { key: "hotel", label: "Hotel", emoji: "🏨", modules: ["rooms", "meals"], defaultUnit: "room" },
  { key: "resort", label: "Resort", emoji: "🏝️", modules: ["rooms", "meals", "experiences"], defaultUnit: "room" },
  { key: "hostel", label: "Hostel", emoji: "🛏️", modules: ["beds"], defaultUnit: "bed" },
  { key: "apartment", label: "Apartment", emoji: "🏠", modules: ["units", "longstay"], defaultUnit: "unit" },
  { key: "serviced_apartment", label: "Serviced Apartment", emoji: "🏢", modules: ["units", "longstay", "meals"], defaultUnit: "unit" },
  { key: "coliving", label: "Co-living", emoji: "🧑‍💻", modules: ["beds", "longstay"], defaultUnit: "bed" },
  { key: "pg", label: "PG", emoji: "🏘️", modules: ["beds", "longstay", "meals"], defaultUnit: "bed" },
  { key: "homestay", label: "Homestay", emoji: "🏡", modules: ["rooms", "meals", "experiences"], defaultUnit: "room" },
  { key: "farm_stay", label: "Farm Stay", emoji: "🌿", modules: ["rooms", "experiences"], defaultUnit: "room" },
  { key: "villa", label: "Villa", emoji: "🏰", modules: ["units"], defaultUnit: "unit" },
  { key: "guest_house", label: "Guest House", emoji: "🏚️", modules: ["rooms"], defaultUnit: "room" },
  { key: "boutique", label: "Boutique Stay", emoji: "✨", modules: ["rooms", "meals"], defaultUnit: "room" },
  { key: "private_room", label: "Private Room", emoji: "🛌", modules: ["rooms"], defaultUnit: "room" },
  { key: "shared_room", label: "Shared Room", emoji: "👥", modules: ["beds"], defaultUnit: "bed" },
  { key: "other", label: "Other", emoji: "➕", modules: ["rooms"], defaultUnit: "room" },
];

export const CATEGORY_BY_KEY = Object.fromEntries(HOSPITALITY_CATEGORIES.map((c) => [c.key, c]));

/** Map legacy single-select labels onto category keys. */
const LEGACY: Record<string, string> = {
  "independent hotel": "hotel", "boutique hotel": "boutique", "chain / group": "hotel",
  "homestay / b&b": "homestay", "serviced apartments": "serviced_apartment", hotel: "hotel",
  resort: "resort", hostel: "hostel",
};
export function normalizeCategory(v: string): string {
  const s = (v || "").trim().toLowerCase();
  if (CATEGORY_BY_KEY[s]) return s;
  if (LEGACY[s]) return LEGACY[s];
  const hit = HOSPITALITY_CATEGORIES.find((c) => c.label.toLowerCase() === s);
  return hit?.key ?? "other";
}

export function modulesFor(types: string[]): Set<PartnerModule> {
  const out = new Set<PartnerModule>();
  (types.length ? types : ["hotel"]).forEach((t) => CATEGORY_BY_KEY[normalizeCategory(t)]?.modules.forEach((m) => out.add(m)));
  return out;
}

export const STAY_PREFERENCES = [
  { key: "family", label: "Family stay" },
  { key: "couple", label: "Couple stay" },
  { key: "business", label: "Business stay" },
  { key: "budget", label: "Budget stay" },
  { key: "luxury", label: "Luxury stay" },
  { key: "private_room", label: "Private room" },
  { key: "shared_room", label: "Shared room" },
  { key: "entire_place", label: "Entire apartment" },
  { key: "short_stay", label: "Short stay" },
  { key: "long_stay", label: "Long stay" },
  { key: "monthly", label: "Monthly stay" },
];

export const AMENITY_CHIPS = [
  { key: "pet_friendly", label: "Pet-friendly" },
  { key: "breakfast", label: "Breakfast" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Parking" },
  { key: "pool", label: "Pool" },
  { key: "ac", label: "AC" },
  { key: "gym", label: "Gym" },
  { key: "restaurant", label: "Restaurant" },
  { key: "kitchen", label: "Kitchen" },
  { key: "laundry", label: "Laundry" },
];

/** Stay-unit implied by a preference key, used for filtering rooms. */
export const PREF_TO_UNIT: Record<string, StayUnit> = { private_room: "room", shared_room: "bed", entire_place: "unit" };
