// JAAGA Land Registration — master field schema derived from Sheet 1.
// Single source of truth for the conversational agent, extractor, planner
// and DB persistence layer.

export type FieldType =
  | "text"
  | "number"
  | "enum"
  | "multi"
  | "stars"
  | "gps"
  | "date"
  | "upload";

export interface FieldDef {
  id: string;
  column: string; // db column name in nl_land_registrations
  label: string;
  type: FieldType;
  group: string;
  required?: boolean;
  options?: string[];
  dependsOn?: (state: Record<string, any>) => boolean;
  adminOnly?: boolean;
  hint?: string;
}

export const LAND_SCHEMA: FieldDef[] = [
  // Owner
  { id: "owner_name", column: "owner_name", label: "Owner name", type: "text", group: "Owner", required: true },
  { id: "owner_phone", column: "owner_phone", label: "Owner phone", type: "text", group: "Owner", required: true },
  { id: "owner_email", column: "owner_email", label: "Owner email", type: "text", group: "Owner" },

  // Location
  { id: "village", column: "village", label: "Village", type: "text", group: "Location", required: true },
  { id: "mandal", column: "mandal", label: "Mandal", type: "text", group: "Location", required: true },
  { id: "district", column: "district", label: "District", type: "text", group: "Location", required: true },
  { id: "state", column: "state", label: "State", type: "text", group: "Location", required: true },
  { id: "google_map_url", column: "google_map_url", label: "Google Maps pin", type: "text", group: "Location" },
  { id: "latitude", column: "latitude", label: "Latitude", type: "number", group: "Location" },
  { id: "longitude", column: "longitude", label: "Longitude", type: "number", group: "Location" },

  // Land
  { id: "total_area", column: "total_area", label: "Total land area", type: "number", group: "Land", required: true },
  { id: "area_unit", column: "area_unit", label: "Area unit", type: "enum", group: "Land", required: true, options: ["Acres", "Hectares", "Guntas", "Cents"] },
  { id: "survey_numbers", column: "survey_numbers", label: "Survey number(s)", type: "text", group: "Land", required: true },
  { id: "soil", column: "soil", label: "Soil type", type: "enum", group: "Land", required: true, options: ["Black", "Red", "Sandy", "Clay", "Mixed", "Unknown"] },
  { id: "terrain", column: "terrain", label: "Terrain", type: "enum", group: "Land", options: ["Flat", "Slope", "Hilly", "Mixed"] },

  // Status & crops
  { id: "current_status", column: "current_status", label: "Current land status", type: "enum", group: "Status", required: true, options: ["Vacant", "Cultivated", "Fallow", "Plantation", "Partially Cultivated"] },
  { id: "available_from", column: "available_from", label: "When will it be available", type: "date", group: "Status" },
  { id: "current_crop", column: "current_crop", label: "Current crop", type: "text", group: "Status", dependsOn: (s) => s.current_status !== "Vacant" },
  { id: "last_crop", column: "last_crop", label: "Last crop", type: "text", group: "Status" },
  {
    id: "crop_history",
    column: "crop_history",
    label: "Crop history (last 5 years)",
    type: "multi",
    group: "Status",
    options: ["Paddy", "Cotton", "Maize", "Groundnut", "Sugarcane", "Banana", "Mango", "Coconut", "Vegetables", "Flowers", "Chilli", "Turmeric", "Millets", "Pulses", "Medicinal Plants", "Others"],
  },
  { id: "lease_reason", column: "lease_reason", label: "Why leasing the land?", type: "enum", group: "Status", options: ["Cannot manage", "Living in another city", "Need income", "Retired", "Labour shortage", "Water shortage", "Other"] },

  // Water
  {
    id: "water_sources",
    column: "water_sources",
    label: "Water sources",
    type: "multi",
    group: "Water",
    required: true,
    options: ["Borewell", "Open Well", "Canal", "River", "Lake", "Farm Pond", "Rain-fed", "Drip Irrigation", "Sprinkler", "No Water"],
  },
  { id: "borewell_count", column: "borewell_count", label: "Number of borewells", type: "number", group: "Water", dependsOn: (s) => Array.isArray(s.water_sources) && s.water_sources.includes("Borewell") },
  { id: "water_availability", column: "water_availability", label: "Water availability", type: "enum", group: "Water", required: true, options: ["Throughout Year", "Seasonal", "Rain Dependent", "Unknown"] },

  // Infrastructure & access
  {
    id: "infrastructure",
    column: "infrastructure",
    label: "Infrastructure available",
    type: "multi",
    group: "Infrastructure",
    options: ["Farm House", "Electricity", "Solar", "Road Access", "Internal Roads", "Fencing", "Storage Shed", "Labour Quarters", "Tractor Access", "Borewell Motor", "Drip Irrigation", "Water Tank", "CCTV"],
  },
  { id: "road_access", column: "road_access", label: "Road access quality", type: "enum", group: "Access", options: ["Excellent", "Good", "Average", "Poor"] },
  { id: "electricity", column: "electricity", label: "Electricity", type: "enum", group: "Access", options: ["Available", "Nearby", "Not Available"] },
  { id: "vehicle_access", column: "vehicle_access", label: "Vehicle access", type: "multi", group: "Access", options: ["Car", "Tractor", "Two Wheeler", "Walking Only"] },

  // Environment
  {
    id: "local_environment",
    column: "local_environment",
    label: "Local environment / surroundings",
    type: "multi",
    group: "Environment",
    options: ["Village Atmosphere", "Highway Facing", "Hill View", "Lake View", "River Side", "Canal Side", "Forest Nearby", "Temple Nearby", "Tourist Area", "Peaceful Location", "Pollution Free", "Scenic Views"],
  },
  {
    id: "nearby_attractions",
    column: "nearby_attractions",
    label: "Nearby attractions",
    type: "multi",
    group: "Environment",
    options: ["Waterfalls", "Hills", "Forest", "Temple", "Dam", "Wildlife", "Vineyard", "Heritage Site", "Village Market"],
  },

  // Readiness
  { id: "farming_readiness", column: "farming_readiness", label: "Land condition / farming readiness", type: "enum", group: "Readiness", options: ["Ready to Cultivate", "Needs Minor Cleaning", "Needs Major Cleaning", "Existing Orchard", "Existing Irrigation", "Recently Cultivated", "Long-term Fallow"] },

  // Opportunity ratings — asked as one bundled step (state stored as object)
  {
    id: "opportunity_ratings",
    column: "opportunity_ratings",
    label: "Opportunity ratings (1-5 stars each)",
    type: "stars",
    group: "Opportunities",
    options: ["Tourism", "Weekend Farming", "Orchard", "Organic Farming", "Dairy", "Poultry", "Fish Farming", "Commercial Farming", "Beekeeping", "Herbal Farming", "Agro Forestry", "Greenhouse"],
  },

  // Experience
  { id: "suitable_for", column: "suitable_for", label: "Suitable for", type: "multi", group: "Experience", options: ["Family Visits", "Kids Activities", "Couples", "School Tours", "College Tours", "Corporate Team Building", "Weekend Camping", "Photography", "Nature Walk", "Bird Watching", "Village Experience"] },
  { id: "school_activities", column: "school_activities", label: "School visit activities possible", type: "multi", group: "Experience", options: ["Seed Sowing", "Tree Plantation", "Vegetable Harvesting", "Fruit Picking", "Cow Feeding", "Goat Feeding", "Poultry Experience", "Fish Feeding", "Tractor Ride", "Bullock Cart Ride", "Compost Making", "Irrigation Demo", "Organic Farming Demo"] },

  // Farm stay
  { id: "stay_accommodation", column: "stay_accommodation", label: "Farm stay accommodation possibilities", type: "multi", group: "Farm Stay", options: ["Existing Farm House", "Can Build Farm Stay", "Luxury Potential", "Camping Only", "Eco Stay", "Tree Houses Possible"] },
  { id: "stay_facilities", column: "stay_facilities", label: "Farm stay facilities available", type: "multi", group: "Farm Stay", options: ["Attached Bathrooms", "Kitchen", "Dining Area", "BBQ Area", "Bonfire", "Swimming Pond", "Children's Play Area", "Parking", "WiFi", "Solar Power"] },
  { id: "stay_experience", column: "stay_experience", label: "Farm stay experiences", type: "multi", group: "Farm Stay", options: ["Sunrise View", "Sunset View", "Star Gazing", "Campfire", "Organic Food", "Local Cuisine"] },

  // Project framing
  { id: "nearby_facilities", column: "nearby_facilities", label: "Nearby facilities", type: "text", group: "Environment", hint: "Known nearby facilities such as schools, hospitals, markets, roads, transport, tourist points or utilities." },
  { id: "best_opportunities", column: "extra.best_opportunities", label: "Best opportunities for this land", type: "multi", group: "Opportunities", options: ["Commercial Farming", "Organic Farming", "Fruit Orchards", "Dairy", "Poultry", "Fish Farming", "Goat Farming", "Beekeeping", "Herbal Farming", "Agro Forestry", "Greenhouse", "Polyhouse", "Tourism", "Weekend Farming", "Farm Stay", "School Visits"] },

  // Project framing
  { id: "project_tenure", column: "project_tenure", label: "Expected tenure of the project", type: "text", group: "Project" },
  { id: "project_duration", column: "project_duration", label: "Project duration", type: "text", group: "Project" },
  { id: "project_age", column: "project_age", label: "How old is the project", type: "text", group: "Project" },
  { id: "project_size", column: "extra.project_size", label: "Project size", type: "text", group: "Project", hint: "Example: 100 Acres." },
  { id: "current_participation", column: "extra.current_participation", label: "Current participation", type: "text", group: "Project", hint: "Example: 40 Acres reserved, 60 Acres available." },
  { id: "minimum_participation", column: "extra.minimum_participation", label: "Minimum participation", type: "text", group: "Project", hint: "Example: 5 Acres." },
  { id: "maximum_participation", column: "extra.maximum_participation", label: "Maximum participation", type: "text", group: "Project", hint: "Example: 20 Acres." },
  { id: "recommended_crop", column: "extra.recommended_crop", label: "JAAGA recommended / finalized crop", type: "text", group: "Project", hint: "Example: Mango Orchard." },
  { id: "recommended_crop_reason", column: "extra.recommended_crop_reason", label: "Why is that crop recommended?", type: "text", group: "Project" },
  { id: "budget_per_acre", column: "extra.budget_per_acre", label: "Budget per acre", type: "text", group: "Project", hint: "Projected cost per acre with phase-wise investment details." },
  { id: "school_schedule_date", column: "extra.school_schedule_date", label: "Date of schedule for schools", type: "date", group: "Experience" },

  // Admin inspection fields are in the Excel sheet, but they are not asked to landowners.
  { id: "verification_date", column: "extra.verification_date", label: "Verification date", type: "date", group: "Admin Inspection", adminOnly: true },
  { id: "gps_verified", column: "extra.gps_verified", label: "GPS verified", type: "enum", group: "Admin Inspection", options: ["Yes", "No", "Pending"], adminOnly: true },
  { id: "ownership_verified", column: "extra.ownership_verified", label: "Ownership verified", type: "enum", group: "Admin Inspection", options: ["Yes", "No", "Pending"], adminOnly: true },
  { id: "documents_verified", column: "extra.documents_verified", label: "Documents verified", type: "enum", group: "Admin Inspection", options: ["Yes", "No", "Pending"], adminOnly: true },
  { id: "duplicate_check", column: "extra.duplicate_check", label: "Duplicate check", type: "enum", group: "Admin Inspection", options: ["Clear", "Duplicate Found", "Pending"], adminOnly: true },

  // Uploads
  { id: "land_photos", column: "land_photos", label: "Land photos", type: "upload", group: "Uploads", required: true },
  { id: "ownership_docs", column: "ownership_docs", label: "Ownership documents", type: "upload", group: "Uploads", required: true },
];

export function fieldById(id: string) {
  return LAND_SCHEMA.find((f) => f.id === id);
}

export function requiredFieldsRemaining(state: Record<string, any>): FieldDef[] {
  return LAND_SCHEMA.filter((f) => {
    if (f.adminOnly) return false;
    if (!f.required) return false;
    if (f.dependsOn && !f.dependsOn(state)) return false;
    const v = state[f.id];
    if (v === undefined || v === null || v === "") return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
}

export function nextMissingField(state: Record<string, any>): FieldDef | null {
  // First required, then nice-to-haves in schema order.
  const req = requiredFieldsRemaining(state);
  if (req.length) return req[0];
  for (const f of LAND_SCHEMA) {
    if (f.adminOnly) continue;
    if (f.dependsOn && !f.dependsOn(state)) continue;
    const v = state[f.id];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return f;
  }
  return null;
}

export function computeCompletion(state: Record<string, any>): number {
  const applicable = LAND_SCHEMA.filter((f) => !f.adminOnly && (!f.dependsOn || f.dependsOn(state)));
  const filled = applicable.filter((f) => {
    const v = state[f.id];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  return Math.round((filled.length / applicable.length) * 100);
}
