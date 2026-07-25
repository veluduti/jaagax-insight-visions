// ============================================================
// EXTRACTED → ENGINE FIELD MAPPER
// Converts raw AI-extracted property fields (returned by the
// `ai-extract-property` edge function) into the field IDs that
// the conversation engine flows (residential / commercial /
// plots / agriculture / coworking) actually understand.
//
// The mapper is intentionally permissive — every category shares
// the same canonical field IDs, so a single mapper covers all
// 5 flows. Unknown keys are dropped silently.
// ============================================================

import type { PropertyCategory } from "./types";

// ------------------------------------------------------------
// SUB-TYPE → property_type (residential flow option labels)
// ------------------------------------------------------------
const RESIDENTIAL_SUBTYPE: Record<string, string> = {
  Flat: "Apartment / Flat",
  Apartment: "Apartment / Flat",
  Villa: "Villa",
  "Independent House": "Independent House",
  "Row House": "Row House / Townhouse",
  Penthouse: "Penthouse",
  Duplex: "Duplex / Triplex",
  Studio: "Studio Apartment",
  "Farm House": "Farm House",
};

const COMMERCIAL_SUBTYPE: Record<string, string> = {
  Shop: "Shop",
  Showroom: "Showroom",
  "Office Space": "Office Space",
  Office: "Office Space",
  Warehouse: "Warehouse",
  Godown: "Warehouse",
  "Commercial Land": "Commercial Land",
};

const PLOT_SUBTYPE: Record<string, string> = {
  Plot: "Residential Plot",
  "Residential Plot": "Residential Plot",
  "Commercial Plot": "Commercial Plot",
  "Industrial Land": "Industrial Plot",
};

const AGRI_SUBTYPE: Record<string, string> = {
  "Farm Land": "Farm Land",
  "Agricultural Land": "Agricultural Land",
};

// ------------------------------------------------------------
// purpose → listing_type
// Residential flow uses "Buy" for sell, "Rent" for rent/lease.
// ------------------------------------------------------------
const PURPOSE_MAP: Record<string, string> = {
  Sale: "Buy",
  Sell: "Buy",
  Rent: "Rent",
  Lease: "Rent",
};

// ------------------------------------------------------------
// Normalisers for multi-select option labels
// ------------------------------------------------------------
function normaliseAmenities(input: any): string[] {
  if (!Array.isArray(input)) return [];
  const canon: Record<string, string> = {
    clubhouse: "Club House",
    "club house": "Club House",
    "swimming pool": "Swimming Pool",
    pool: "Swimming Pool",
    gym: "Gym",
    fitness: "Gym",
    security: "Security",
    "24x7 security": "Security",
    "power backup": "Power Backup",
    "kids play area": "Children Play Area",
    "children play area": "Children Play Area",
    "play area": "Children Play Area",
    parking: "Parking",
    "covered parking": "Parking",
    lift: "Lift",
    elevator: "Lift",
    "walking track": "Walking Track",
    "jogging track": "Walking Track",
    "indoor games": "Indoor Games",
    park: "Park",
    garden: "Park",
  };
  const out = new Set<string>();
  for (const raw of input) {
    if (!raw) continue;
    const key = String(raw).trim().toLowerCase();
    out.add(canon[key] || String(raw).trim());
  }
  return Array.from(out);
}

function normaliseApprovals(input: any): string[] {
  const arr: string[] = Array.isArray(input) ? input : input ? [input] : [];
  const canon: Record<string, string> = {
    rera: "RERA Approved",
    "ts rera": "RERA Approved",
    "rera approved": "RERA Approved",
    hmda: "HMDA Approved",
    dtcp: "DTCP Approved",
    crda: "CRDA Approved",
    municipal: "Municipal Approved",
    panchayat: "Panchayat Approved",
  };
  const out = new Set<string>();
  for (const raw of arr) {
    if (!raw) continue;
    const key = String(raw).trim().toLowerCase();
    out.add(canon[key] || String(raw).trim());
  }
  return Array.from(out);
}

function normaliseFacing(input: any): string | undefined {
  const first = Array.isArray(input) ? input[0] : input;
  if (!first) return undefined;
  return String(first)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normaliseFurnishing(input: any): string | undefined {
  if (!input) return undefined;
  const s = String(input).toLowerCase();
  if (s.includes("fully")) return "Fully Furnished";
  if (s.includes("semi")) return "Semi-Furnished";
  if (s.includes("un")) return "Unfurnished";
  return String(input);
}

// ============================================================
// MAIN
// ============================================================
export function mapExtractedToEngineFields(
  extracted: Record<string, any> | null | undefined,
  category?: PropertyCategory | null,
  confidences?: Record<string, number> | null,
  minConfidence = 0.5,
): Record<string, unknown> {
  if (!extracted) return {};
  const out: Record<string, unknown> = {};
  const e = extracted;
  const conf = confidences || {};
  const ok = (key: string) => {
    const c = conf[key];
    return c == null ? true : c >= minConfidence;
  };

  // ---------------- Property type ----------------
  const subKey = String(e.sub_type || "").trim();
  let propertyType: string | undefined;
  if (category === "commercial") propertyType = COMMERCIAL_SUBTYPE[subKey];
  else if (category === "plots") propertyType = PLOT_SUBTYPE[subKey];
  else if (category === "agriculture") propertyType = AGRI_SUBTYPE[subKey];
  else propertyType = RESIDENTIAL_SUBTYPE[subKey];

  if (!propertyType) {
    if (e.type === "RESIDENTIAL") propertyType = "Apartment / Flat";
    else if (e.type === "COMMERCIAL") propertyType = "Office Space";
    else if (e.type === "LAND") propertyType = category === "agriculture" ? "Farm Land" : "Residential Plot";
  }
  if (propertyType && (ok("sub_type") || ok("type"))) out.property_type = propertyType;

  // ---------------- Listing type ----------------
  if (e.purpose && PURPOSE_MAP[e.purpose] && ok("purpose")) {
    out.listing_type = PURPOSE_MAP[e.purpose];
  }

  // ---------------- BHK / bedrooms / bathrooms / balconies ----------------
  if (e.bhk && ok("bhk")) {
    const n = Number(e.bhk);
    if (Number.isFinite(n) && n > 0) out.bhk_type = `${n} BHK`;
  }
  if (e.bedrooms && ok("bedrooms")) {
    const n = Number(e.bedrooms);
    if (Number.isFinite(n) && n > 0) {
      out.bedroom_count = n;
      if (!out.bhk_type) out.bhk_type = `${n} BHK`;
    }
  }
  if (e.bathrooms && ok("bathrooms")) {
    const n = Number(e.bathrooms);
    if (Number.isFinite(n) && n > 0) out.bathroom_count = n;
  }
  if (e.balconies != null && ok("balconies")) {
    const n = Number(e.balconies);
    if (Number.isFinite(n) && n >= 0) out.balcony_count = n;
  }

  // ---------------- Area ----------------
  if (e.built_up_area && Number.isFinite(Number(e.built_up_area)) && ok("built_up_area")) {
    const area = Number(e.built_up_area);
    const unit = String(e.area_unit || "sq ft").toLowerCase();
    const isLandUnit = ["acre", "gunta", "cent", "sq yd"].includes(unit);
    if (isLandUnit || category === "plots" || category === "agriculture" || subKey === "Plot") {
      out.land_size = area;
      out.total_land_area = area;
    } else {
      out.flat_size = area;
      out.built_area = area;
    }
  }
  if (e.carpet_area && ok("carpet_area")) out.carpet_area = Number(e.carpet_area);
  if (e.super_builtup_area && ok("super_builtup_area")) out.super_builtup_area = Number(e.super_builtup_area);

  // ---------------- Price ----------------
  if (typeof e.price === "number" && e.price > 0 && ok("price")) {
    if (out.listing_type === "Rent") out.monthly_rent = e.price;
    else out.total_price = e.price;
  }
  if (typeof e.price_per_unit === "number" && e.price_per_unit > 0 && ok("price_per_unit")) {
    out.price_per_unit = e.price_per_unit;
  }

  // ---------------- Furnishing / counts ----------------
  const furn = normaliseFurnishing(e.furnishing);
  if (furn && ok("furnishing")) out.furnishing_status = furn;
  if (e.car_parking && Number(e.car_parking) > 0 && ok("car_parking")) out.parking_count = Number(e.car_parking);

  // ---------------- Facing ----------------
  const facing = normaliseFacing(e.facing);
  if (facing && ok("facing")) out.property_facing = facing;

  // ---------------- Multi-select labels ----------------
  const amenities = normaliseAmenities(e.amenities);
  if (amenities.length && ok("amenities")) out.amenities = amenities;
  const approvals = normaliseApprovals(e.approval);
  if (approvals.length && ok("approval")) out.approvals = approvals;

  // ---------------- Project / highlights / builder / rera ----------------
  if (e.project_name && ok("project_name")) out.project_name = e.project_name;
  if ((e.title || e.project_name) && (ok("title") || ok("project_name"))) {
    out.property_highlights = e.title || e.project_name;
  }
  if (e.description && ok("description")) out.description = e.description;
  if (e.builder_name && ok("builder_name")) out.builder_name = e.builder_name;
  if (e.rera_number && ok("rera_number")) {
    out.rera_number = e.rera_number;
    out.rera_id = e.rera_number;
  }

  // ---------------- Location composite ----------------
  const loc: Record<string, any> = {};
  if (e.city && ok("city")) loc.city = String(e.city).trim();
  if ((e.locality || e.location) && (ok("locality") || ok("location"))) {
    loc.locality = String(e.locality || e.location).trim();
  }
  if (e.landmark && ok("landmark")) loc.landmark = String(e.landmark).trim();
  if (e.address && ok("address")) loc.address = String(e.address).trim();
  if (e.pincode && ok("pincode")) loc.pincode = String(e.pincode).trim();
  if (e.district && ok("district")) loc.district = String(e.district).trim();
  if (e.state && ok("state")) loc.state_name = String(e.state).trim();
  if (typeof e.latitude === "number" && ok("latitude")) loc.latitude = e.latitude;
  if (typeof e.longitude === "number" && ok("longitude")) loc.longitude = e.longitude;
  if (Object.keys(loc).length) {
    loc.country = loc.country || e.country || "India";
    out.location = loc;
  }

  // ---------------- Contact ----------------
  if (e.contact_phone && ok("contact_phone")) {
    const digits = String(e.contact_phone).replace(/\D/g, "");
    if (digits.length >= 10) out.mobile_number = digits.slice(-10);
  }
  if (e.contact_name && ok("contact_name")) out.contact_name = e.contact_name;

  // ---------------- Possession / age / ownership ----------------
  if (e.possession_date && ok("possession_date")) out.possession_date = e.possession_date;
  if (e.possession_status && ok("possession_status")) out.possession_status = e.possession_status;
  if (e.property_age && ok("property_age")) out.property_age = e.property_age;
  if (e.ownership && ok("ownership")) out.ownership = e.ownership;

  // ---------------- Plot specifics ----------------
  if (typeof e.road_width === "number" && ok("road_width")) out.road_width = e.road_width;
  if (typeof e.corner_plot === "boolean" && ok("corner_plot")) out.corner_plot = e.corner_plot ? "Yes" : "No";
  if (typeof e.water_connection === "boolean" && ok("water_connection")) out.water_connection = e.water_connection ? "Yes" : "No";
  if (typeof e.electricity === "boolean" && ok("electricity")) out.electricity = e.electricity ? "Yes" : "No";

  return out;
}

