// JAAGA Land Registration — master field schema derived from Sheet 1.
// Single source of truth for the conversational agent, extractor, planner
// and DB persistence layer.

export type FieldType = "text" | "number" | "enum" | "multi" | "stars" | "gps" | "date" | "upload";

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
  // ===== LOCATION =====
  {
    id: "village",
    column: "village",
    label: "Village",
    type: "text",
    group: "Location",
    required: true,
  },
  {
    id: "mandal",
    column: "mandal",
    label: "Mandal",
    type: "text",
    group: "Location",
    required: true,
  },
  {
    id: "district",
    column: "district",
    label: "District",
    type: "text",
    group: "Location",
    required: true,
  },
  {
    id: "state",
    column: "state",
    label: "State",
    type: "text",
    group: "Location",
    required: true,
  },
  {
    id: "google_map_url",
    column: "google_map_url",
    label: "Google Maps pin",
    type: "text",
    group: "Location",
    hint: "Paste the Google Maps link or drop a pin",
  },
  {
    id: "latitude",
    column: "latitude",
    label: "Latitude",
    type: "number",
    group: "Location",
    hint: "Auto-populated from map or enter manually",
  },
  {
    id: "longitude",
    column: "longitude",
    label: "Longitude",
    type: "number",
    group: "Location",
    hint: "Auto-populated from map or enter manually",
  },

  // ===== LAND =====
  {
    id: "total_area",
    column: "total_area",
    label: "Total land area",
    type: "number",
    group: "Land",
    required: true,
    hint: "Enter the total land area",
  },
  {
    id: "area_unit",
    column: "area_unit",
    label: "Area unit",
    type: "enum",
    group: "Land",
    required: true,
    options: ["Acres", "Hectares", "Guntas", "Cents"],
    hint: "Select the unit you're using",
  },
  {
    id: "survey_numbers",
    column: "survey_numbers",
    label: "Survey number(s)",
    type: "text",
    group: "Land",
    required: true,
    hint: "Enter the survey numbers for this land",
  },
  {
    id: "soil",
    column: "soil",
    label: "Soil type",
    type: "enum",
    group: "Land",
    required: true,
    options: ["Black", "Red", "Sandy", "Clay", "Mixed", "Unknown"],
    hint: "What type of soil does your land have?",
  },
  {
    id: "terrain",
    column: "terrain",
    label: "Terrain",
    type: "enum",
    group: "Land",
    options: ["Flat", "Slope", "Hilly", "Mixed"],
    hint: "What's the terrain like?",
  },

  // ===== STATUS & CROPS =====
  {
    id: "current_status",
    column: "current_status",
    label: "Current land status",
    type: "enum",
    group: "Status",
    required: true,
    options: ["Vacant", "Cultivated", "Fallow", "Plantation", "Partially Cultivated"],
    hint: "What's the current status of your land?",
  },
  {
    id: "available_from",
    column: "available_from",
    label: "When will it be available",
    type: "date",
    group: "Status",
    hint: "When can the land be made available? (DD/MM/YYYY)",
  },
  {
    id: "current_crop",
    column: "current_crop",
    label: "Current crop",
    type: "text",
    group: "Status",
    dependsOn: (s) => s.current_status !== "Vacant",
    hint: "What crop is currently growing?",
  },
  {
    id: "last_crop",
    column: "last_crop",
    label: "Last crop",
    type: "text",
    group: "Status",
    hint: "What was the last crop grown?",
  },
  {
    id: "crop_history",
    column: "crop_history",
    label: "Crop history (last 5 years)",
    type: "multi",
    group: "Status",
    options: [
      "Paddy",
      "Cotton",
      "Maize",
      "Groundnut",
      "Sugarcane",
      "Banana",
      "Mango",
      "Coconut",
      "Vegetables",
      "Flowers",
      "Chilli",
      "Turmeric",
      "Millets",
      "Pulses",
      "Medicinal Plants",
      "Others",
    ],
    hint: "Select all crops grown in the last 5 years",
  },
  {
    id: "lease_reason",
    column: "lease_reason",
    label: "Why leasing the land?",
    type: "enum",
    group: "Status",
    options: [
      "Cannot manage",
      "Living in another city",
      "Need income",
      "Retired",
      "Labour shortage",
      "Water shortage",
      "Other",
    ],
    hint: "What's your reason for leasing?",
  },

  // ===== WATER =====
  {
    id: "water_sources",
    column: "water_sources",
    label: "Water source",
    type: "multi",
    group: "Water",
    required: true,
    options: [
      "Borewell",
      "Open Well",
      "Canal",
      "River",
      "Lake",
      "Farm Pond",
      "Rain-fed",
      "Drip Irrigation",
      "Sprinkler",
      "No Water",
    ],
    hint: "Select all available water sources",
  },
  {
    id: "borewell_count",
    column: "borewell_count",
    label: "Number of borewells",
    type: "number",
    group: "Water",
    dependsOn: (s) => Array.isArray(s.water_sources) && s.water_sources.includes("Borewell"),
    hint: "How many borewells are there?",
  },
  {
    id: "water_availability",
    column: "water_availability",
    label: "Water availability",
    type: "enum",
    group: "Water",
    required: true,
    options: ["Throughout Year", "Seasonal", "Rain Dependent", "Unknown"],
    hint: "How available is water throughout the year?",
  },

  // ===== INFRASTRUCTURE & ACCESS =====
  {
    id: "infrastructure",
    column: "infrastructure",
    label: "Infrastructure available",
    type: "multi",
    group: "Infrastructure",
    options: [
      "Farm House",
      "Electricity",
      "Solar",
      "Road Access",
      "Internal Roads",
      "Fencing",
      "Storage Shed",
      "Labour Quarters",
      "Tractor Access",
      "Borewell Motor",
      "Drip Irrigation",
      "Water Tank",
      "CCTV",
    ],
    hint: "Select all infrastructure available on the land",
  },
  {
    id: "road_access",
    column: "road_access",
    label: "Road access",
    type: "enum",
    group: "Access",
    options: ["Excellent", "Good", "Average", "Poor"],
    hint: "How's the road access to the land?",
  },
  {
    id: "electricity",
    column: "electricity",
    label: "Electricity",
    type: "enum",
    group: "Access",
    options: ["Available", "Nearby", "Not Available"],
    hint: "Is electricity available?",
  },
  {
    id: "vehicle_access",
    column: "vehicle_access",
    label: "Vehicle access",
    type: "multi",
    group: "Access",
    options: ["Car", "Tractor", "Two Wheeler", "Walking Only"],
    hint: "What vehicles can access the land?",
  },

  // ===== ENVIRONMENT =====
  {
    id: "local_environment",
    column: "local_environment",
    label: "Local environment / surroundings",
    type: "multi",
    group: "Environment",
    options: [
      "Village Atmosphere",
      "Highway Facing",
      "Hill View",
      "Lake View",
      "River Side",
      "Canal Side",
      "Forest Nearby",
      "Temple Nearby",
      "Tourist Area",
      "Peaceful Location",
      "Pollution Free",
      "Scenic Views",
    ],
    hint: "What's the surrounding environment like?",
  },
  {
    id: "nearby_attractions",
    column: "nearby_attractions",
    label: "Nearby attractions",
    type: "multi",
    group: "Environment",
    options: [
      "Waterfalls",
      "Hills",
      "Forest",
      "Temple",
      "Dam",
      "Wildlife",
      "Vineyard",
      "Heritage Site",
      "Village Market",
    ],
    hint: "What attractions are nearby?",
  },
  {
    id: "nearby_facilities",
    column: "extra.nearby_facilities",
    label: "Nearby facilities",
    type: "text",
    group: "Environment",
    hint: "Known nearby facilities such as schools, hospitals, markets, roads, transport, tourist points or utilities.",
  },

  // ===== READINESS =====
  {
    id: "farming_readiness",
    column: "farming_readiness",
    label: "Land condition / farming readiness",
    type: "enum",
    group: "Readiness",
    options: [
      "Ready to Cultivate",
      "Needs Minor Cleaning",
      "Needs Major Cleaning",
      "Existing Orchard",
      "Existing Irrigation",
      "Recently Cultivated",
      "Long-term Fallow",
    ],
    hint: "What's the current land condition for farming?",
  },

  // ===== OPPORTUNITIES =====
  // Opportunity ratings — asked as one bundled step (state stored as object)
  {
    id: "opportunity_ratings",
    column: "opportunity_ratings",
    label: "Opportunity ratings (1-5 stars each)",
    type: "stars",
    group: "Opportunities",
    options: [
      "Tourism",
      "Weekend Farming",
      "Orchard",
      "Organic Farming",
      "Dairy",
      "Poultry",
      "Fish Farming",
      "Commercial Farming",
      "Fruit Orchards",
      "Goat Farming",
      "Beekeeping",
      "Herbal Farming",
      "Agro Forestry",
      "Greenhouse",
      "Polyhouse",
    ],
    hint: "Rate each opportunity from 1 to 5 stars",
  },
  {
    id: "best_opportunities",
    column: "extra.best_opportunities",
    label: "Best opportunities for this land",
    type: "multi",
    group: "Opportunities",
    options: [
      "Commercial Farming",
      "Organic Farming",
      "Fruit Orchards",
      "Dairy",
      "Poultry",
      "Fish Farming",
      "Goat Farming",
      "Beekeeping",
      "Herbal Farming",
      "Agro Forestry",
      "Greenhouse",
      "Polyhouse",
      "Tourism",
      "Weekend Farming",
      "Farm Stay",
      "School Visits",
    ],
    hint: "What are the best opportunities this land offers?",
  },

  // ===== EXPERIENCE =====
  {
    id: "suitable_for",
    column: "suitable_for",
    label: "Farm experience - suitable for",
    type: "multi",
    group: "Experience",
    options: [
      "Family Visits",
      "Kids Activities",
      "Couples",
      "School Tours",
      "College Tours",
      "Corporate Team Building",
      "Weekend Camping",
      "Photography",
      "Nature Walk",
      "Bird Watching",
      "Village Experience",
    ],
    hint: "What experiences can this land offer?",
  },
  {
    id: "school_activities",
    column: "school_activities",
    label: "School visit activities possible",
    type: "multi",
    group: "Experience",
    options: [
      "Seed Sowing",
      "Tree Plantation",
      "Vegetable Harvesting",
      "Fruit Picking",
      "Cow Feeding",
      "Goat Feeding",
      "Poultry Experience",
      "Fish Feeding",
      "Tractor Ride",
      "Bullock Cart Ride",
      "Compost Making",
      "Irrigation Demo",
      "Organic Farming Demo",
    ],
    hint: "What activities can schools offer on the farm?",
  },
  {
    id: "school_schedule_date",
    column: "extra.school_schedule_date",
    label: "Date of schedule for schools",
    type: "date",
    group: "Experience",
    hint: "When is the school visit scheduled? (DD/MM/YYYY)",
  },

  // ===== FARM STAY =====
  {
    id: "stay_accommodation",
    column: "stay_accommodation",
    label: "Farm stay accommodation possibilities",
    type: "multi",
    group: "Farm Stay",
    options: [
      "Existing Farm House",
      "Can Build Farm Stay",
      "Luxury Potential",
      "Camping Only",
      "Eco Stay",
      "Tree Houses Possible",
    ],
    hint: "What accommodation options are available?",
  },
  {
    id: "stay_facilities",
    column: "stay_facilities",
    label: "Farm stay facilities available",
    type: "multi",
    group: "Farm Stay",
    options: [
      "Attached Bathrooms",
      "Kitchen",
      "Dining Area",
      "BBQ Area",
      "Bonfire",
      "Swimming Pond",
      "Children's Play Area",
      "Parking",
      "WiFi",
      "Solar Power",
    ],
    hint: "What facilities are available for farm stays?",
  },
  {
    id: "stay_experience",
    column: "stay_experience",
    label: "Farm stay experiences",
    type: "multi",
    group: "Farm Stay",
    options: ["Sunrise View", "Sunset View", "Star Gazing", "Campfire", "Organic Food", "Local Cuisine"],
    hint: "What experiences can guests enjoy?",
  },

  // ===== PROJECT =====
  {
    id: "project_tenure",
    column: "project_tenure",
    label: "Expected tenure of the project",
    type: "text",
    group: "Project",
    hint: "How long is the expected project tenure? (e.g., 5 years)",
  },
  {
    id: "project_duration",
    column: "project_duration",
    label: "Project duration",
    type: "text",
    group: "Project",
    hint: "What's the project duration?",
  },
  {
    id: "project_age",
    column: "project_age",
    label: "How old is the project",
    type: "text",
    group: "Project",
    hint: "How long has this project been running?",
  },
  {
    id: "project_size",
    column: "extra.project_size",
    label: "Project size",
    type: "text",
    group: "Project",
    hint: "Example: 100 Acres.",
  },
  {
    id: "current_participation",
    column: "extra.current_participation",
    label: "Current participation",
    type: "text",
    group: "Project",
    hint: "Example: 40 Acres reserved, 60 Acres available.",
  },
  {
    id: "minimum_participation",
    column: "extra.minimum_participation",
    label: "Minimum participation",
    type: "text",
    group: "Project",
    hint: "Example: 5 Acres.",
  },
  {
    id: "maximum_participation",
    column: "extra.maximum_participation",
    label: "Maximum participation",
    type: "text",
    group: "Project",
    hint: "Example: 20 Acres.",
  },
  {
    id: "recommended_crop",
    column: "extra.recommended_crop",
    label: "JAAGA recommended / finalized crop",
    type: "text",
    group: "Project",
    hint: "Example: Mango Orchard.",
  },
  {
    id: "recommended_crop_reason",
    column: "extra.recommended_crop_reason",
    label: "Why is that crop recommended?",
    type: "text",
    group: "Project",
    hint: "Explain why this crop is recommended",
  },
  {
    id: "budget_per_acre",
    column: "extra.budget_per_acre",
    label: "Budget per acre",
    type: "text",
    group: "Project",
    hint: "Projected cost per acre with phase-wise investment details.",
  },
  {
    id: "projected_returns",
    column: "extra.projected_returns",
    label: "Projected Returns",
    type: "text",
    group: "Project",
    hint: "What are the projected returns?",
  },
  {
    id: "best_suitable",
    column: "extra.best_suitable",
    label: "Best Suitable For",
    type: "text",
    group: "Project",
    hint: "What is this project best suitable for?",
  },

  // ===== ADMIN INSPECTION =====
  {
    id: "verification_date",
    column: "extra.verification_date",
    label: "Verification date",
    type: "date",
    group: "Admin Inspection",
    adminOnly: true,
  },
  {
    id: "gps_verified",
    column: "extra.gps_verified",
    label: "GPS verified",
    type: "enum",
    group: "Admin Inspection",
    options: ["Yes", "No", "Pending"],
    adminOnly: true,
  },
  {
    id: "ownership_verified",
    column: "extra.ownership_verified",
    label: "Ownership verified",
    type: "enum",
    group: "Admin Inspection",
    options: ["Yes", "No", "Pending"],
    adminOnly: true,
  },
  {
    id: "documents_verified",
    column: "extra.documents_verified",
    label: "Documents verified",
    type: "enum",
    group: "Admin Inspection",
    options: ["Yes", "No", "Pending"],
    adminOnly: true,
  },
  {
    id: "duplicate_check",
    column: "extra.duplicate_check",
    label: "Duplicate check",
    type: "enum",
    group: "Admin Inspection",
    options: ["Clear", "Duplicate Found", "Pending"],
    adminOnly: true,
  },

  // ===== UPLOADS =====
  {
    id: "land_photos",
    column: "land_photos",
    label: "Land photos",
    type: "upload",
    group: "Uploads",
    required: true,
    hint: "Upload photos of the land (JPEG, PNG, PDF)",
  },
  {
    id: "ownership_docs",
    column: "ownership_docs",
    label: "Ownership documents",
    type: "upload",
    group: "Uploads",
    required: true,
    hint: "Upload ownership documents (PDF, JPEG, PNG)",
  },
];

// ===== HELPER FUNCTIONS =====

export function fieldById(id: string): FieldDef | undefined {
  return LAND_SCHEMA.find((f) => f.id === id);
}

function isSkipped(state: Record<string, any>, id: string): boolean {
  const s = state.__skipped;
  return Array.isArray(s) && s.includes(id);
}

export function requiredFieldsRemaining(state: Record<string, any>): FieldDef[] {
  return LAND_SCHEMA.filter((f) => {
    if (f.adminOnly) return false;
    if (!f.required) return false;
    if (f.dependsOn && !f.dependsOn(state)) return false;
    if (isSkipped(state, f.id)) return false;
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
    if (isSkipped(state, f.id)) continue;
    const v = state[f.id];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return f;
  }
  return null;
}

export function computeCompletion(state: Record<string, any>): number {
  const applicable = LAND_SCHEMA.filter((f) => !f.adminOnly && (!f.dependsOn || f.dependsOn(state)));
  const filled = applicable.filter((f) => {
    if (isSkipped(state, f.id)) return true;
    const v = state[f.id];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  return Math.round((filled.length / applicable.length) * 100);
}

export function getFieldOptions(fieldId: string): string[] {
  const field = fieldById(fieldId);
  return field?.options || [];
}

export function getFieldsByGroup(group: string): FieldDef[] {
  return LAND_SCHEMA.filter((f) => f.group === group);
}

export function getRequiredFields(): FieldDef[] {
  return LAND_SCHEMA.filter((f) => f.required && !f.adminOnly);
}

export function getUploadFields(): FieldDef[] {
  return LAND_SCHEMA.filter((f) => f.type === "upload");
}

export function getAdminFields(): FieldDef[] {
  return LAND_SCHEMA.filter((f) => f.adminOnly);
}
