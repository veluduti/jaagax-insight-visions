/**
 * Property type → accommodation type engine. Partners never see a generic
 * "Add Room" form: each property type allows specific accommodation kinds,
 * and each kind defines its own wording, stay unit and extra fields.
 * Values are stored on hotel_rooms.accommodation_kind and hotel_rooms.attributes.
 */
import type { StayUnit } from "./hospitalityCategories";
import { normalizeCategory } from "./hospitalityCategories";

export type AttrField =
  | { key: string; label: string; kind: "number" | "text" | "boolean" }
  | { key: string; label: string; kind: "select"; options: string[] }
  | { key: string; label: string; kind: "multi"; options: string[] };

export interface AccommodationKind {
  key: string; label: string; emoji: string; unit: StayUnit;
  /** Word used for individual inventory items, e.g. "Room", "Bed", "Apartment". */
  noun: string; namePlaceholder: string; categories: string[]; fields: AttrField[];
}

const ROOM_FEATURES: AttrField = { key: "features", label: "Room features", kind: "multi", options: ["Attached bathroom", "Balcony", "Workspace", "Air conditioning", "TV", "Wi-Fi", "Mini fridge", "Wardrobe", "Safe"] };
const VIEW: AttrField = { key: "view", label: "View", kind: "select", options: ["Garden", "Pool", "Beach", "Mountain", "Lake", "City", "None"] };
const OUTDOOR: AttrField = { key: "outdoor", label: "Outdoor features", kind: "multi", options: ["Private garden", "Deck", "Terrace", "Fire pit", "Sit-out"] };
const HOME: AttrField[] = [
  { key: "bedrooms", label: "Bedrooms", kind: "number" },
  { key: "bathrooms", label: "Bathrooms", kind: "number" },
  { key: "living_room", label: "Living room", kind: "boolean" },
  { key: "kitchen", label: "Kitchen", kind: "boolean" },
];

export const ACCOMMODATION_KINDS: Record<string, AccommodationKind> = {
  room: { key: "room", label: "Room", emoji: "🏨", unit: "room", noun: "Room", namePlaceholder: "e.g. Deluxe King Room", categories: ["Standard", "Deluxe", "Premium", "Executive", "Suite", "Other"], fields: [ROOM_FEATURES, VIEW] },
  villa: { key: "villa", label: "Villa", emoji: "🏡", unit: "unit", noun: "Villa", namePlaceholder: "e.g. Pool Villa", categories: ["Private Villa", "Pool Villa", "Garden Villa", "Beach Villa"], fields: [...HOME, { key: "pool", label: "Pool", kind: "select", options: ["Private pool", "Shared pool", "No pool"] }, VIEW, OUTDOOR, { key: "beach_access", label: "Beach access", kind: "boolean" }] },
  cottage: { key: "cottage", label: "Cottage", emoji: "🏕", unit: "unit", noun: "Cottage", namePlaceholder: "e.g. Garden Cottage", categories: ["Standard", "Premium", "Family"], fields: [{ key: "bedrooms", label: "Bedrooms", kind: "number" }, VIEW, OUTDOOR] },
  tent: { key: "tent", label: "Tent", emoji: "⛺", unit: "unit", noun: "Tent", namePlaceholder: "e.g. Luxury Glamping Tent", categories: ["Glamping", "Swiss tent", "Dome", "Basic"], fields: [{ key: "attached_bath", label: "Attached bathroom", kind: "boolean" }, { key: "power", label: "Electricity", kind: "boolean" }, VIEW] },
  cabin: { key: "cabin", label: "Cabin", emoji: "🛖", unit: "unit", noun: "Cabin", namePlaceholder: "e.g. Wooden Cabin", categories: ["Standard", "A-frame", "Treehouse"], fields: [{ key: "bedrooms", label: "Bedrooms", kind: "number" }, VIEW, OUTDOOR] },
  apartment: { key: "apartment", label: "Apartment", emoji: "🏢", unit: "unit", noun: "Apartment", namePlaceholder: "e.g. 2BHK Executive Apartment", categories: ["Studio", "1BHK", "2BHK", "3BHK", "4BHK+"], fields: [...HOME, { key: "furnishing", label: "Furnishing", kind: "select", options: ["Fully furnished", "Semi furnished", "Unfurnished"] }, { key: "housekeeping", label: "Housekeeping", kind: "select", options: ["Daily", "Alternate days", "Weekly", "On request"] }, { key: "appliances", label: "Appliances", kind: "multi", options: ["Washing machine", "Microwave", "Refrigerator", "Induction / stove", "Dishwasher", "Water purifier"] }] },
  dorm: { key: "dorm", label: "Dormitory", emoji: "🛏", unit: "bed", noun: "Bed", namePlaceholder: "e.g. 8-Bed Mixed Dorm", categories: ["Mixed", "Female only", "Male only"], fields: [{ key: "beds_in_room", label: "Beds in this dorm", kind: "number" }, { key: "bed_style", label: "Bed style", kind: "select", options: ["Bunk bed", "Single bed", "Pod"] }, { key: "bed_features", label: "Per-bed features", kind: "multi", options: ["Locker", "Reading light", "Charging point", "Privacy curtain"] }, { key: "attached_bath", label: "Attached bathroom", kind: "boolean" }] },
  private_room: { key: "private_room", label: "Private Room", emoji: "🛌", unit: "room", noun: "Room", namePlaceholder: "e.g. Private Double Room", categories: ["Single", "Double", "Twin", "Family"], fields: [ROOM_FEATURES] },
  shared_room: { key: "shared_room", label: "Shared Room", emoji: "👥", unit: "bed", noun: "Bed", namePlaceholder: "e.g. Twin Sharing Room", categories: ["Double sharing", "Triple sharing", "Quad sharing"], fields: [{ key: "beds_in_room", label: "Beds in this room", kind: "number" }, { key: "gender", label: "Residents", kind: "select", options: ["Co-ed", "Female only", "Male only"] }, { key: "bed_features", label: "Per-bed features", kind: "multi", options: ["Wardrobe", "Study table", "Locker", "Charging point"] }, { key: "attached_bath", label: "Attached bathroom", kind: "boolean" }] },
  entire_home: { key: "entire_home", label: "Entire Home", emoji: "🏠", unit: "unit", noun: "Home", namePlaceholder: "e.g. Entire Farmhouse", categories: ["Cottage", "House", "Farmhouse", "Bungalow"], fields: [...HOME, OUTDOOR, { key: "host_onsite", label: "Host lives on site", kind: "boolean" }] },
};

interface TypeDef { allowed: string[]; cta: string }
const TYPES: Record<string, TypeDef> = {
  hotel: { allowed: ["room"], cta: "Add Room Type" },
  boutique: { allowed: ["room"], cta: "Add Room Type" },
  guest_house: { allowed: ["room"], cta: "Add Room Type" },
  private_room: { allowed: ["private_room"], cta: "Add Room" },
  resort: { allowed: ["room", "villa", "cottage", "tent", "cabin"], cta: "Add Accommodation" },
  serviced_apartment: { allowed: ["apartment"], cta: "Add Apartment Type" },
  apartment: { allowed: ["apartment"], cta: "Add Apartment Type" },
  villa: { allowed: ["villa", "entire_home"], cta: "Add Villa" },
  hostel: { allowed: ["dorm", "private_room"], cta: "Add Dorm or Room" },
  shared_room: { allowed: ["shared_room"], cta: "Add Shared Room" },
  coliving: { allowed: ["private_room", "shared_room"], cta: "Add Room" },
  pg: { allowed: ["private_room", "shared_room"], cta: "Add Room" },
  homestay: { allowed: ["room", "entire_home", "cottage"], cta: "Add Accommodation" },
  farm_stay: { allowed: ["cottage", "room", "tent", "entire_home"], cta: "Add Accommodation" },
  other: { allowed: ["room", "private_room", "shared_room", "apartment", "villa", "cottage", "tent", "entire_home"], cta: "Add Accommodation" },
};

export function typeDef(type: string): TypeDef { return TYPES[normalizeCategory(type)] ?? TYPES.other; }

/** Accommodation kinds allowed across the given property types (deduped, ordered). */
export function allowedKinds(types: string[]): AccommodationKind[] {
  const keys = new Set<string>();
  (types.length ? types : ["hotel"]).forEach((t) => typeDef(t).allowed.forEach((k) => keys.add(k)));
  return [...keys].map((k) => ACCOMMODATION_KINDS[k]).filter(Boolean);
}

export function addCtaFor(types: string[]): string {
  return types.length === 1 ? typeDef(types[0]).cta : "Add Accommodation";
}

/** Fallback kind for legacy rows without accommodation_kind. */
export function kindFor(key: string | null | undefined, unit?: string | null): AccommodationKind {
  if (key && ACCOMMODATION_KINDS[key]) return ACCOMMODATION_KINDS[key];
  return unit === "bed" ? ACCOMMODATION_KINDS.dorm : unit === "unit" ? ACCOMMODATION_KINDS.apartment : ACCOMMODATION_KINDS.room;
}
