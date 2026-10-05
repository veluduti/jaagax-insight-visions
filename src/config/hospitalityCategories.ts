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

/** Type-specific setup questions stored in partner_hotels.type_details. */
export interface TypeSetupField { key: string; label: string; kind: "text" | "number" | "boolean" | "select"; options?: string[] }
const common: TypeSetupField[] = [{ key: "house_rules", label: "House rules", kind: "text" }];
export const TYPE_SETUP_FIELDS: Record<string, TypeSetupField[]> = {
  hotel: [{ key: "front_desk_24h", label: "24-hour front desk", kind: "boolean" }, { key: "restaurant", label: "In-house restaurant", kind: "boolean" }, ...common],
  resort: [{ key: "acres", label: "Property size (acres)", kind: "number" }, { key: "activities", label: "Activities offered", kind: "text" }, { key: "pool", label: "Swimming pool", kind: "boolean" }, ...common],
  hostel: [{ key: "dorm_gender", label: "Dorm type", kind: "select", options: ["Mixed", "Female only", "Male only"] }, { key: "lockers", label: "Lockers", kind: "boolean" }, { key: "common_kitchen", label: "Common kitchen", kind: "boolean" }, ...common],
  apartment: [{ key: "bhk", label: "Configuration (BHK)", kind: "select", options: ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"] }, { key: "furnishing", label: "Furnishing", kind: "select", options: ["Fully furnished", "Semi furnished", "Unfurnished"] }, { key: "kitchen", label: "Kitchen", kind: "boolean" }, ...common],
  serviced_apartment: [{ key: "housekeeping", label: "Housekeeping frequency", kind: "select", options: ["Daily", "Alternate days", "Weekly"] }, { key: "kitchen", label: "Kitchenette", kind: "boolean" }, ...common],
  coliving: [{ key: "gender", label: "Residents", kind: "select", options: ["Co-ed", "Female only", "Male only"] }, { key: "workspace", label: "Co-working space", kind: "boolean" }, { key: "community_events", label: "Community events", kind: "boolean" }, { key: "min_months", label: "Minimum stay (months)", kind: "number" }, ...common],
  pg: [{ key: "gender", label: "PG for", kind: "select", options: ["Boys", "Girls", "Co-ed"] }, { key: "food", label: "Meals included", kind: "select", options: ["None", "Breakfast", "Breakfast + Dinner", "All meals"] }, { key: "deposit_months", label: "Security deposit (months)", kind: "number" }, { key: "curfew", label: "Gate closing time", kind: "text" }, ...common],
  homestay: [{ key: "host_lives_onsite", label: "Host lives on site", kind: "boolean" }, { key: "home_food", label: "Home-cooked food", kind: "boolean" }, ...common],
  farm_stay: [{ key: "farm_activities", label: "Farm activities", kind: "text" }, { key: "organic_food", label: "Organic farm food", kind: "boolean" }, { key: "pets", label: "Pets allowed", kind: "boolean" }, ...common],
};
export function setupFieldsFor(types: string[]): TypeSetupField[] {
  const seen = new Set<string>(); const out: TypeSetupField[] = [];
  for (const t of types) for (const f of TYPE_SETUP_FIELDS[normalizeCategory(t)] ?? []) if (!seen.has(f.key)) { seen.add(f.key); out.push(f); }
  return out.length ? out : common;
}

/** Ready-made inventory types partners can add per business category. */
export interface InventoryPreset { name: string; unit: StayUnit; price: number; occupancy: number }
export const INVENTORY_PRESETS: Record<string, InventoryPreset[]> = {
  hotel: [{ name: "Standard Room", unit: "room", price: 2000, occupancy: 2 }, { name: "Deluxe Room", unit: "room", price: 3000, occupancy: 3 }, { name: "Suite", unit: "room", price: 5500, occupancy: 4 }],
  resort: [{ name: "Garden Cottage", unit: "room", price: 4500, occupancy: 3 }, { name: "Pool Villa", unit: "unit", price: 9000, occupancy: 4 }, { name: "Tent / Glamping", unit: "room", price: 3000, occupancy: 2 }],
  hostel: [{ name: "Mixed Dorm Bed", unit: "bed", price: 500, occupancy: 1 }, { name: "Female Dorm Bed", unit: "bed", price: 600, occupancy: 1 }, { name: "Private Room", unit: "room", price: 1500, occupancy: 2 }],
  apartment: [{ name: "1 BHK Apartment", unit: "unit", price: 2500, occupancy: 2 }, { name: "2 BHK Apartment", unit: "unit", price: 4000, occupancy: 4 }, { name: "3 BHK Apartment", unit: "unit", price: 6000, occupancy: 6 }],
  serviced_apartment: [{ name: "Studio", unit: "unit", price: 3000, occupancy: 2 }, { name: "1 BHK Serviced", unit: "unit", price: 4000, occupancy: 3 }, { name: "2 BHK Serviced", unit: "unit", price: 6000, occupancy: 4 }],
  coliving: [{ name: "Shared Room Bed", unit: "bed", price: 500, occupancy: 1 }, { name: "Private Room", unit: "room", price: 1200, occupancy: 1 }],
  pg: [{ name: "Single Sharing", unit: "bed", price: 600, occupancy: 1 }, { name: "Double Sharing Bed", unit: "bed", price: 400, occupancy: 1 }, { name: "Triple Sharing Bed", unit: "bed", price: 300, occupancy: 1 }],
  homestay: [{ name: "Family Room", unit: "room", price: 2000, occupancy: 4 }, { name: "Private Room", unit: "room", price: 1500, occupancy: 2 }],
  farm_stay: [{ name: "Farm Cottage", unit: "room", price: 3000, occupancy: 3 }, { name: "Mud House", unit: "room", price: 2500, occupancy: 2 }, { name: "Entire Farmhouse", unit: "unit", price: 8000, occupancy: 8 }],
  villa: [{ name: "Entire Villa", unit: "unit", price: 10000, occupancy: 8 }],
  guest_house: [{ name: "Standard Room", unit: "room", price: 1200, occupancy: 2 }],
  boutique: [{ name: "Signature Room", unit: "room", price: 4000, occupancy: 2 }, { name: "Boutique Suite", unit: "room", price: 6500, occupancy: 3 }],
  private_room: [{ name: "Private Room", unit: "room", price: 1200, occupancy: 2 }],
  shared_room: [{ name: "Shared Room Bed", unit: "bed", price: 400, occupancy: 1 }],
  other: [{ name: "Room", unit: "room", price: 1500, occupancy: 2 }],
};
