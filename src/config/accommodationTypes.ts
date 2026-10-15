/**
 * Property type → accommodation type engine. Partners never see a generic
 * "Add Room" form: each property type allows specific accommodation kinds,
 * and each kind defines its own wording, stay unit and extra fields.
 * Values are stored on hotel_rooms.accommodation_kind and hotel_rooms.attributes.
 */
import type { StayUnit } from "./hospitalityCategories";
import { normalizeCategory } from "./hospitalityCategories";

type FieldBase = { key: string; label: string; section?: string; help?: string };
export type AttrField =
  | (FieldBase & { kind: "number" | "text" | "boolean" })
  | (FieldBase & { kind: "select"; options: string[] })
  | (FieldBase & { kind: "multi"; options: string[] });

export interface AccommodationKind {
  key: string; label: string; emoji: string; unit: StayUnit;
  /** Word used for individual inventory items, e.g. "Room", "Bed", "Apartment". */
  noun: string; namePlaceholder: string; categories: string[]; fields: AttrField[];
  /** PG / Hostel / Co-living: weekly + monthly rent, advance, deposit and tenancy policies. */
  longStay?: boolean;
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

/* ---------- PG / Hostel / Co-living field groups ---------- */
const sec = (section: string, fields: AttrField[]): AttrField[] => fields.map((f) => ({ ...f, section }));
const UNIT_BASICS = (extra: AttrField[] = []) => sec("Basic details", [
  { key: "room_number", label: "Room number", kind: "text" },
  { key: "floor", label: "Floor", kind: "text" },
  ...extra,
]);
const RENT = (opts: { food?: boolean; service?: boolean; longDiscount?: boolean } = {}) => sec("Rent & advance", [
  { key: "min_months", label: "Minimum rental duration (months)", kind: "number" },
  { key: "advance_mode", label: "Advance payment", kind: "select", options: ["None", "Fixed amount", "One month rent", "Two month rent"] },
  { key: "advance_amount", label: "Fixed advance amount ₹ (if fixed)", kind: "number" },
  { key: "security_deposit", label: "Security deposit ₹", kind: "number", help: "Refundable — kept separate from rent and advance." },
  { key: "deposit_refundable", label: "Deposit refundable", kind: "boolean" },
  { key: "deposit_adjustment", label: "Deposit adjustment / deduction rules", kind: "text" },
  { key: "utility_charges", label: "Utilities per month ₹ (electricity, water, Wi-Fi)", kind: "number" },
  { key: "utilities_included", label: "Included in rent", kind: "multi", options: ["Electricity", "Water", "Wi-Fi", "Gas", "Maintenance"] },
  ...(opts.food ? [{ key: "food_charges", label: "Food charges per month ₹", kind: "number" } as AttrField,
    { key: "meal_plan", label: "Meal plan", kind: "select", options: ["No food", "Breakfast", "Breakfast + Dinner", "All meals"] } as AttrField] : []),
  ...(opts.service ? [{ key: "service_charges", label: "Membership / service charge per month ₹", kind: "number" } as AttrField] : []),
  ...(opts.longDiscount ? [{ key: "long_commit_discount", label: "Discount for 6+ month commitment (%)", kind: "number" } as AttrField] : []),
  { key: "other_fees", label: "One-time fees ₹ (onboarding, cleaning)", kind: "number" },
  { key: "tax_percent", label: "Applicable tax (%)", kind: "number" },
]);
const POLICIES = (extra: AttrField[] = []) => sec("Policies", [
  { key: "notice_days", label: "Notice period (days)", kind: "number" },
  { key: "early_termination", label: "Early termination rule", kind: "text" },
  { key: "moveout_rules", label: "Move-out rules", kind: "text" },
  { key: "visitor_policy", label: "Visitor policy", kind: "select", options: ["Not allowed", "Day visitors only", "Allowed with prior notice", "Allowed"] },
  ...extra,
]);
const PG_FACILITIES = sec("PG facilities", [
  { key: "bathroom", label: "Bathroom", kind: "select", options: ["Attached", "Shared"] },
  { key: "furnishing", label: "Furnishing", kind: "select", options: ["Fully furnished", "Semi furnished", "Unfurnished"] },
  { key: "facilities", label: "Facilities", kind: "multi", options: ["Air conditioning", "Wi-Fi", "Wardrobe", "Study table", "Laundry", "Housekeeping", "Kitchen access", "Parking", "Power backup", "CCTV", "Hot water"] },
]);
const PG_POLICY_EXTRA: AttrField[] = [
  { key: "gender", label: "PG for", kind: "select", options: ["Boys", "Girls", "Co-ed"] },
  { key: "eligibility", label: "Who can stay", kind: "multi", options: ["Students", "Working professionals", "Families"] },
];
const HOSTEL_FACILITIES = sec("Hostel facilities", [
  { key: "facilities", label: "Facilities", kind: "multi", options: ["Wi-Fi", "Lockers", "Laundry", "Common area", "Kitchen", "Dining area", "Food available", "Hot water", "CCTV"] },
]);
const HOSTEL_POLICY_EXTRA: AttrField[] = [
  { key: "curfew", label: "Curfew time", kind: "text" },
  { key: "quiet_hours", label: "Quiet hours", kind: "text" },
  { key: "cancellation_refund", label: "Cancellation & refund rule", kind: "text" },
];
const COLIVING_SERVICES = sec("Community & services", [
  { key: "furnishing", label: "Furnishing", kind: "select", options: ["Fully furnished", "Semi furnished", "Unfurnished"] },
  { key: "facilities", label: "Services & facilities", kind: "multi", options: ["Wi-Fi", "Workspace", "Housekeeping", "Laundry", "Meals", "Shared kitchen", "Gym", "Recreation room", "Community events", "Parking"] },
]);
const COLIVING_POLICY_EXTRA: AttrField[] = [
  { key: "agreement_months", label: "Agreement duration (months)", kind: "number" },
  { key: "renewal_rules", label: "Renewal & extension rules", kind: "text" },
  { key: "gender", label: "Residents", kind: "select", options: ["Co-ed", "Female only", "Male only"] },
];
const BEDS = (bunk: boolean) => sec("Beds & occupancy", [
  { key: "beds_in_room", label: "Beds in this room", kind: "number" },
  ...(bunk ? [{ key: "bed_style", label: "Bed style", kind: "select", options: ["Bunk bed", "Single bed", "Pod"] } as AttrField] : []),
  { key: "bed_features", label: "Per-bed features", kind: "multi", options: ["Locker", "Wardrobe", "Study table", "Reading light", "Charging point", "Privacy curtain"] },
]);

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
  pg_room: { key: "pg_room", label: "PG Private Room", emoji: "🚪", unit: "room", noun: "Room", namePlaceholder: "e.g. Single Occupancy AC Room", categories: ["Single occupancy", "Double occupancy"], longStay: true, fields: [...UNIT_BASICS(), ...RENT({ food: true }), ...PG_FACILITIES, ...POLICIES(PG_POLICY_EXTRA)] },
  pg_shared: { key: "pg_shared", label: "PG Sharing Bed", emoji: "🛏", unit: "bed", noun: "Bed", namePlaceholder: "e.g. Double Sharing Bed", categories: ["Double sharing", "Triple sharing", "Quad sharing"], longStay: true, fields: [...UNIT_BASICS(), ...BEDS(false), ...RENT({ food: true }), ...PG_FACILITIES, ...POLICIES(PG_POLICY_EXTRA)] },
  hostel_dorm: { key: "hostel_dorm", label: "Hostel Dorm Bed", emoji: "🛏", unit: "bed", noun: "Bed", namePlaceholder: "e.g. 6-Bed Mixed Dorm", categories: ["Mixed", "Female only", "Male only"], longStay: true, fields: [...UNIT_BASICS([{ key: "bathroom", label: "Bathroom", kind: "select", options: ["Attached", "Shared"] }]), ...BEDS(true), ...RENT({ food: true }), ...HOSTEL_FACILITIES, ...POLICIES(HOSTEL_POLICY_EXTRA)] },
  hostel_private: { key: "hostel_private", label: "Hostel Private Room", emoji: "🛌", unit: "room", noun: "Room", namePlaceholder: "e.g. Private Twin Room", categories: ["Single", "Twin", "Double"], longStay: true, fields: [...UNIT_BASICS([{ key: "bathroom", label: "Bathroom", kind: "select", options: ["Attached", "Shared"] }, { key: "gender", label: "Allowed for", kind: "select", options: ["Mixed", "Female only", "Male only"] }]), ...RENT({ food: true }), ...HOSTEL_FACILITIES, ...POLICIES(HOSTEL_POLICY_EXTRA)] },
  coliving_private: { key: "coliving_private", label: "Co-living Private Room", emoji: "🚪", unit: "room", noun: "Room", namePlaceholder: "e.g. Private Studio Room", categories: ["Private room", "Studio"], longStay: true, fields: [...UNIT_BASICS([{ key: "bathroom", label: "Bathroom", kind: "select", options: ["Attached", "Shared"] }]), ...RENT({ food: true, service: true, longDiscount: true }), ...COLIVING_SERVICES, ...POLICIES(COLIVING_POLICY_EXTRA)] },
  coliving_shared: { key: "coliving_shared", label: "Co-living Shared Bed", emoji: "👥", unit: "bed", noun: "Bed", namePlaceholder: "e.g. Twin Sharing Bed", categories: ["Double sharing", "Triple sharing"], longStay: true, fields: [...UNIT_BASICS(), ...BEDS(false), ...RENT({ food: true, service: true, longDiscount: true }), ...COLIVING_SERVICES, ...POLICIES(COLIVING_POLICY_EXTRA)] },
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
  hostel: { allowed: ["hostel_dorm", "hostel_private"], cta: "Add Dorm or Room" },
  shared_room: { allowed: ["shared_room"], cta: "Add Shared Room" },
  coliving: { allowed: ["coliving_private", "coliving_shared"], cta: "Add Room or Bed" },
  pg: { allowed: ["pg_room", "pg_shared"], cta: "Add Room or Bed" },
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

/** Fallback kind for legacy rows without accommodation_kind.
 *  When the property's business types are given and the saved kind isn't allowed for any of them
 *  (e.g. an old hotel "room" inside a PG/Hostel/Co-living), map it to the matching allowed kind so
 *  long-stay rooms get monthly/weekly booking instead of nightly dates. */
export function kindFor(key: string | null | undefined, unit?: string | null, bizTypes?: string[] | null): AccommodationKind {
  const base = key && ACCOMMODATION_KINDS[key]
    ? ACCOMMODATION_KINDS[key]
    : unit === "bed" ? ACCOMMODATION_KINDS.dorm : unit === "unit" ? ACCOMMODATION_KINDS.apartment : ACCOMMODATION_KINDS.room;
  if (!bizTypes?.length || base.longStay) return base;
  const allowed = allowedKinds(bizTypes);
  if (allowed.some((k) => k.key === base.key)) return base;
  const longStay = allowed.filter((k) => k.longStay);
  if (!longStay.length) return base;
  const wantBed = (unit || base.unit) === "bed";
  return longStay.find((k) => (k.unit === "bed") === wantBed) ?? longStay[0];
}

/** Customer-facing wording for one accommodation listing. */
export function customerView(room: {
  room_type: string; accommodation_kind?: string | null; stay_unit?: string | null;
  attributes?: Record<string, any> | null; monthly_price?: number | null; weekly_price?: number | null;
}, bizTypes?: string[] | null) {
  const kind = kindFor(room.accommodation_kind, room.stay_unit, bizTypes);
  const noun = kind.noun.toLowerCase();
  const title = kind.unit === "bed" && !/bed\b/i.test(room.room_type) ? `${room.room_type} — Bed` : room.room_type;
  const a = room.attributes || {};
  const highlights: string[] = [];
  if (a.bedrooms) highlights.push(`${a.bedrooms} bedroom${a.bedrooms > 1 ? "s" : ""}`);
  if (a.bathrooms) highlights.push(`${a.bathrooms} bath`);
  if (a.beds_in_room) highlights.push(`${a.beds_in_room} beds in room`);
  if (a.pool && a.pool !== "No pool") highlights.push(a.pool);
  if (a.view && a.view !== "None") highlights.push(`${a.view} view`);
  if (a.furnishing) highlights.push(a.furnishing);
  if (a.gender) highlights.push(a.gender);
  if (a.bathroom) highlights.push(`${a.bathroom} bathroom`);
  if (a.meal_plan && a.meal_plan !== "No food") highlights.push(a.meal_plan);
  if (a.bed_style) highlights.push(a.bed_style);
  if (a.kitchen) highlights.push("Kitchen");
  if (a.attached_bath) highlights.push("Attached bathroom");
  if (a.beach_access) highlights.push("Beach access");
  for (const k of ["features", "bed_features", "outdoor", "appliances", "facilities"]) if (Array.isArray(a[k])) highlights.push(...a[k]);
  const monthly = Number(room.monthly_price) > 0 ? Number(room.monthly_price) : null;
  const weekly = Number(room.weekly_price) > 0 ? Number(room.weekly_price) : null;
  return { kind, noun, title, highlights, monthly, weekly, perNightLabel: `per ${noun} / night` };
}
