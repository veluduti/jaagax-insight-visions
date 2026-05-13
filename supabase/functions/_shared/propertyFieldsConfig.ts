// ============================================================
// Dynamic property field config — single source of truth.
// Aligned strictly to the JAAGA X conversational listing knowledge.
// Both edge functions and the frontend read from this catalog.
// ============================================================

export type FieldInput =
  | "text" | "textarea" | "number" | "phone" | "email"
  | "single" | "multi" | "yesno" | "media" | "date"
  | "city" | "locality" | "price_unit";

export type FieldConfig = {
  id: string;
  question: string;
  input: FieldInput;
  required?: boolean;
  options?: string[];
  section?: string;
  max?: number;
};

// 5 top-level categories (knowledge spec)
export const CATEGORY_OPTIONS = [
  "Residential",
  "Plots / Land",
  "Commercial",
  "Agricultural Lands",
  "Co-working / Shared Spaces",
];

// 11 residential sub-types (knowledge spec)
export const RESIDENTIAL_SUBTYPES = [
  "Apartment / Flat",
  "Independent House",
  "Villa",
  "Duplex / Triplex",
  "Penthouse",
  "Row House / Townhouse",
  "Farm House",
  "Studio Apartment",
  "Serviced Apartment",
  "Builder Floor Apartment",
  "Gated Community House",
];

// Apartment-style sub-types → ask Flat Size + BHK + furnishing
export const APARTMENT_LIKE = new Set([
  "Apartment / Flat",
  "Penthouse",
  "Studio Apartment",
  "Builder Floor Apartment",
  "Serviced Apartment",
]);

// House/land-style sub-types → ask Land Size + Built Area + BHK
export const HOUSE_LIKE = new Set([
  "Independent House",
  "Villa",
  "Duplex / Triplex",
  "Farm House",
  "Row House / Townhouse",
  "Gated Community House",
]);

export const AREA_UNITS = ["Sq Ft", "Sq Yard", "Sq Meter", "Cent", "Gunta", "Acre", "Bigha", "Hectare", "Katha"];
export const FACING_OPTIONS = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
export const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"];
export const FURNISHING_OPTIONS = ["Unfurnished", "Semi Furnished", "Fully Furnished"];
export const FURNISHING_ITEMS = ["AC", "Wardrobes", "Modular Kitchen", "Geysers", "Beds", "Sofa", "Dining Table", "TV"];

export const AMENITIES_OPTIONS = [
  "Lift", "Parking", "Swimming Pool", "Gym", "Security", "Club House",
  "Power Backup", "Children Play Area", "Garden",
];

export const PAYMENT_OPTIONS = [
  "Price Negotiable", "Bank Loan Available", "EMI Available", "Installments Available",
  "Flexible Payment Plan", "Construction Linked Payment", "Possession Linked Payment",
  "Zero Down Payment", "Low Booking Amount", "Assured Rental Returns",
  "Investor Friendly", "NRI Assistance", "Pre-EMI Support", "Premium Bank Tie-Ups",
  "Custom Payment Plans", "Immediate Registration",
];

export const APPROVAL_OPTIONS = [
  "RERA Approved", "HMDA Approved", "DTCP Approved", "CRDA Approved",
  "Municipal Approved", "Panchayat Approved", "LP Number Available", "Approved Layout",
];

export const HIGHLIGHT_OPTIONS = [
  "Verified Property", "Verified Owner", "RERA Approved", "Price Drop", "Best Deal",
  "Hot Property", "Premium Listing", "Ready to Move", "Immediate Possession",
  "Gated Community", "Luxury Living", "Near Metro", "Fully Furnished", "Family Friendly",
];

export const PROPERTY_AGE_OPTIONS = ["0-1 Years", "1-5 Years", "5-10 Years", "10+ Years"];
export const PROPERTY_CONDITION_OPTIONS = ["New", "Resale"];
export const AVAILABILITY_OPTIONS = ["Ready", "Under Construction"];
export const OWNER_TYPE_OPTIONS = ["Owner", "Agent", "Builder"];
export const LISTING_TYPE_OPTIONS = ["Buy", "Rent"];

// Number quick-reply chips
export const NUMBER_QUICK_REPLIES: Record<string, string[]> = {
  flat_size: ["600", "1000", "1250", "1500", "2000"],
  built_up_area: ["600", "1000", "1250", "1500", "2000"],
  land_size: ["100", "200", "300", "500", "1000"],
  total_floors: ["3", "5", "10", "15", "20+"],
  floor_number: ["Ground", "1", "2", "3", "5", "10"],
  total_towers: ["1", "2", "4", "6", "10+"],
  total_units: ["50", "100", "200", "500", "1000+"],
  road_width: ["20", "30", "40", "60"],
  parking: ["1", "2", "3", "4+"],
  bathrooms: ["1", "2", "3", "4+"],
  total_acres: ["1", "2", "5", "10", "20+"],
  monthly_rent: ["10000", "15000", "25000", "40000", "60000"],
  total_price: ["2500000", "5000000", "10000000", "20000000"],
  price_per_unit: ["3000", "4500", "6000", "8500"],
};

// ============================================================
// Field catalog — knowledge-spec aligned
// ============================================================
const FIELDS: FieldConfig[] = [
  // 1. Category (always first)
  { id: "category", question: "What type of property would you like to list?", input: "single", required: true, options: CATEGORY_OPTIONS, section: "Basic" },

  // 2. Residential sub-type (only if category = Residential)
  { id: "residential_type", question: "What is your residential property type?", input: "single", required: true, options: RESIDENTIAL_SUBTYPES, section: "Basic" },

  // 3. Owner type
  { id: "owner_type", question: "Who are you listing this property as?", input: "single", required: true, options: OWNER_TYPE_OPTIONS, section: "Basic" },

  // 4. Listing type
  { id: "listing_type", question: "What type of listing is this?", input: "single", required: true, options: LISTING_TYPE_OPTIONS, section: "Basic" },

  // 5. Pricing — Buy
  { id: "total_price", question: "What is the total price?", input: "number", required: true, section: "Price" },
  { id: "price_unit_type", question: "Which unit do you want to use?", input: "single", required: true, options: AREA_UNITS, section: "Price" },
  { id: "price_per_unit", question: "Price per unit?", input: "number", required: true, section: "Price" },

  // 5. Pricing — Rent
  { id: "monthly_rent", question: "What is the monthly rent?", input: "number", required: true, section: "Price" },
  { id: "available_from", question: "When will the property be available?", input: "date", required: true, section: "Availability" },

  // 6. Condition + Age
  { id: "property_condition", question: "What is the property condition?", input: "single", required: true, options: PROPERTY_CONDITION_OPTIONS, section: "Condition" },
  { id: "property_age", question: "What is the property age?", input: "single", required: true, options: PROPERTY_AGE_OPTIONS, section: "Condition" },

  // 7. Availability status
  { id: "availability_status", question: "What is the availability status?", input: "single", required: true, options: AVAILABILITY_OPTIONS, section: "Availability" },

  // 8. Sizes
  { id: "flat_size", question: "What is the flat built-up area (Sq Ft)?", input: "number", required: true, section: "Area" },
  { id: "land_size", question: "What is the land size?", input: "number", required: true, section: "Area" },
  { id: "land_unit", question: "Land area unit?", input: "single", required: true, options: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"], section: "Area" },
  { id: "built_up_area", question: "Built-up area (Sq Ft)?", input: "number", required: true, section: "Area" },

  // 9. BHK
  { id: "bhk", question: "What is the BHK type?", input: "single", required: true, options: BHK_OPTIONS, section: "Configuration" },

  // 10. Project / community details
  { id: "project_name", question: "Community / project name?", input: "text", section: "Project" },
  { id: "gated_community", question: "Is it inside a gated community?", input: "yesno", section: "Project" },
  { id: "total_towers", question: "How many towers in the project?", input: "number", section: "Project" },
  { id: "total_floors", question: "Total floors per tower?", input: "number", section: "Project" },
  { id: "total_units", question: "Total units in the project?", input: "number", section: "Project" },
  { id: "project_land_area", question: "Total land area of the project?", input: "text", section: "Project" },

  // 11. Furnishing
  { id: "furnishing_status", question: "What is the furnishing status?", input: "single", required: true, options: FURNISHING_OPTIONS, section: "Furnishing" },
  { id: "furnishing_items", question: "What furnishing items are included?", input: "multi", options: FURNISHING_ITEMS, section: "Furnishing" },

  // 12. Facing
  { id: "facing", question: "What is the property facing?", input: "single", required: true, options: FACING_OPTIONS, section: "Configuration" },

  // 13. Amenities
  { id: "amenities", question: "What amenities are available?", input: "multi", options: AMENITIES_OPTIONS, section: "Amenities" },

  // 14. Payment options
  { id: "payment_options", question: "What payment options are available?", input: "multi", options: PAYMENT_OPTIONS, section: "Payment" },

  // 15. Approvals
  { id: "approvals", question: "What approvals does this property have?", input: "multi", required: true, options: APPROVAL_OPTIONS, section: "Legal" },

  // 16. Location hierarchy
  { id: "country", question: "Country?", input: "text", required: true, section: "Location" },
  { id: "state", question: "State?", input: "text", required: true, section: "Location" },
  { id: "city", question: "City?", input: "city", required: true, section: "Location" },
  { id: "locality", question: "Area / Locality?", input: "locality", required: true, section: "Location" },
  { id: "sub_locality", question: "Sub-locality?", input: "text", section: "Location" },
  { id: "landmark", question: "Nearest landmark?", input: "text", section: "Location" },
  { id: "address", question: "Full address?", input: "textarea", section: "Location" },
  { id: "pincode", question: "ZIP / PIN code?", input: "number", required: true, section: "Location" },

  // 17. Highlights (max 3)
  { id: "highlights", question: "Select up to 3 property highlights or ribbons.", input: "multi", options: HIGHLIGHT_OPTIONS, section: "Highlights", max: 3 },

  // 18. Media + contact (always last)
  { id: "media", question: "Upload photos of your property (optional)", input: "media", section: "Media" },
  { id: "contact_name", question: "Your full name?", input: "text", required: true, section: "Contact" },
  { id: "contact_mobile", question: "Mobile number?", input: "phone", required: true, section: "Contact" },
];

const FIELD_BY_ID: Record<string, FieldConfig> = Object.fromEntries(FIELDS.map((f) => [f.id, f]));

// ============================================================
// Conditional logic — what's relevant given current state
// ============================================================
function isApartmentLike(state: Record<string, any>): boolean {
  const t = state.residential_type;
  return typeof t === "string" && APARTMENT_LIKE.has(t);
}

function isHouseLike(state: Record<string, any>): boolean {
  const t = state.residential_type;
  return typeof t === "string" && HOUSE_LIKE.has(t);
}

function fieldRelevant(id: string, state: Record<string, any>): boolean {
  const cat = state.category;
  const lt = String(state.listing_type || "").toLowerCase();
  const cond = String(state.property_condition || "").toLowerCase();
  const furn = String(state.furnishing_status || "").toLowerCase();

  // Residential sub-type only when category=Residential
  if (id === "residential_type") return cat === "Residential";

  // Pricing — Buy hides rent fields; Rent hides price fields
  if (id === "total_price" || id === "price_unit_type" || id === "price_per_unit") return lt === "buy";
  if (id === "monthly_rent" || id === "available_from") return lt === "rent";

  // Property age only if Resale
  if (id === "property_age") return cond === "resale";

  // Sizes
  if (id === "flat_size") return isApartmentLike(state);
  if (id === "land_size" || id === "land_unit") return isHouseLike(state);
  if (id === "built_up_area") return isHouseLike(state); // also asked for house types
  if (id === "bhk") return isApartmentLike(state) || isHouseLike(state);

  // Furnishing items only if Semi/Fully Furnished
  if (id === "furnishing_items") return furn === "semi furnished" || furn === "fully furnished";

  // Project details only when residential building
  if (
    id === "project_name" || id === "gated_community" || id === "total_towers" ||
    id === "total_floors" || id === "total_units" || id === "project_land_area"
  ) return cat === "Residential";

  // Furnishing only for residential building / commercial / coworking (not pure plots)
  if (id === "furnishing_status") {
    if (cat === "Plots / Land" || cat === "Agricultural Lands") return false;
    return true;
  }

  // Amenities not for raw land
  if (id === "amenities") return cat !== "Plots / Land" && cat !== "Agricultural Lands";

  return true;
}

// ============================================================
// Ordered, conditional flow
// ============================================================
// Strict knowledge-spec order:
// Category → Type → Listed By → Listing Type → Condition → Availability →
// SIZE (must come before pricing) → PRICING → BHK → Project → Furnishing →
// Facing → Amenities → Payment → Approvals → Location → Highlights → Media → Contact
const ORDER: string[] = [
  "category",
  "residential_type",
  "owner_type",
  "listing_type",
  "property_condition", "property_age",
  "availability_status",
  "available_from",
  // SIZE BEFORE PRICE
  "flat_size",
  "land_size", "land_unit", "built_up_area",
  // PRICE AFTER SIZE
  "total_price", "price_unit_type", "price_per_unit",
  "monthly_rent",
  "bhk",
  "project_name", "gated_community", "total_towers", "total_floors", "total_units", "project_land_area",
  "furnishing_status", "furnishing_items",
  "facing",
  "amenities",
  "payment_options",
  "approvals",
  "country", "state", "city", "locality", "sub_locality", "landmark", "address", "pincode",
  "highlights",
  "media", "contact_name", "contact_mobile",
];

export function buildFieldFlow(_subtypes: string[] = []): FieldConfig[] {
  return ORDER.map((id) => FIELD_BY_ID[id]).filter(Boolean);
}

function isFilled(v: any): boolean {
  if (v === null) return true; // explicitly skipped
  if (Array.isArray(v)) return v.length > 0;
  return v !== undefined && v !== "";
}

export function pickNextField(state: Record<string, any>): FieldConfig | null {
  for (const id of ORDER) {
    const f = FIELD_BY_ID[id];
    if (!f) continue;
    if (!fieldRelevant(id, state)) continue;
    if (isFilled(state[id])) continue;
    return f;
  }
  return null;
}

export function flowProgress(state: Record<string, any>): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (const id of ORDER) {
    if (!fieldRelevant(id, state)) continue;
    total++;
    if (isFilled(state[id])) filled++;
  }
  return { filled, total: Math.max(total, 1) };
}

export type CompletionTier = {
  label: "Draft" | "Partial" | "Good" | "Premium";
  pct: number;
  color: string;
};

export function completionTier(state: Record<string, any>): CompletionTier {
  const { filled, total } = flowProgress(state);
  const pct = Math.round((filled / Math.max(total, 1)) * 100);
  if (pct < 30) return { label: "Draft", pct, color: "text-muted-foreground" };
  if (pct < 60) return { label: "Partial", pct, color: "text-amber-500" };
  if (pct < 80) return { label: "Good", pct, color: "text-emerald-500" };
  return { label: "Premium", pct, color: "text-primary" };
}

export function missingRequired(state: Record<string, any>): FieldConfig[] {
  return ORDER
    .map((id) => FIELD_BY_ID[id])
    .filter((f) => f && f.required && fieldRelevant(f.id, state) && !isFilled(state[f.id]));
}

export function answeredFields(state: Record<string, any>): Array<{ field: FieldConfig; value: any }> {
  return ORDER
    .map((id) => FIELD_BY_ID[id])
    .filter(Boolean)
    .map((f) => ({ field: f, value: state[f.id] }))
    .filter(({ value }) =>
      value !== undefined && value !== null && value !== "" &&
      (!Array.isArray(value) || value.length > 0),
    );
}

// Legacy compat exports (kept so other files don't break)
export const COMMON_FIELDS: FieldConfig[] = [];
export const CONTACT_FIELDS: FieldConfig[] = [
  FIELD_BY_ID.media, FIELD_BY_ID.contact_name, FIELD_BY_ID.contact_mobile,
].filter(Boolean) as FieldConfig[];

export type PropertySubType = string;
export const SUBTYPE_LABEL: Record<string, string> = {};
export const ALL_SUBTYPE_LABELS: string[] = RESIDENTIAL_SUBTYPES;
export function labelToSubType(label: string): string | null { return label || null; }
export const TYPE_FIELDS: Record<string, FieldConfig[]> = {};
