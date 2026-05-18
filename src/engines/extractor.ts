// ============================================================
// ADVANCED EXTRACTION ENGINE
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type { PropertyCategory } from "@/engines/types";

// ============================================================
// TYPES
// ============================================================

export type ListingType = "buy" | "rent";

export interface ExtractionResult {
  greeting?: boolean;

  correction?: boolean;

  intent?: string;

  category?: PropertyCategory;

  propertyType?: string;

  listingType?: ListingType;

  bhk?: string;

  price?: number;

  priceUnit?: string;

  fields?: Record<string, unknown>;

  confidence?: number;
}

// ============================================================
// HELPERS
// ============================================================

function normalizeText(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

// ============================================================
// GREETING DETECTION
// ============================================================

export function detectGreeting(message: string): boolean {
  const lower = normalizeText(message);

  const greetings = ["hi", "hello", "hey", "good morning", "good evening", "good afternoon"];

  return greetings.some((greeting) => lower.includes(greeting));
}

// ============================================================
// CORRECTION DETECTION
// ============================================================

export function detectCorrection(message: string): boolean {
  const lower = normalizeText(message);

  const correctionWords = ["actually", "sorry", "change", "update", "correction", "instead", "not"];

  return correctionWords.some((word) => lower.includes(word));
}

// ============================================================
// INTENT DETECTION
// ============================================================

export function detectIntent(message: string): string | undefined {
  const lower = normalizeText(message);

  if (lower.includes("sell") || lower.includes("sale")) {
    return "sell_property";
  }

  if (lower.includes("rent") || lower.includes("lease")) {
    return "rent_property";
  }

  if (lower.includes("buy")) {
    return "buy_property";
  }

  return undefined;
}

// ============================================================
// LISTING TYPE
// ============================================================

export function extractListingType(message: string): ListingType | undefined {
  const lower = normalizeText(message);

  if (lower.includes("rent") || lower.includes("lease")) {
    return "rent";
  }

  if (lower.includes("sell") || lower.includes("sale") || lower.includes("buy")) {
    return "buy";
  }

  return undefined;
}

// ============================================================
// PROPERTY TYPE
// ============================================================

export function extractPropertyType(message: string): string | undefined {
  const lower = normalizeText(message);

  const mappings = [
    {
      keywords: ["villa", "vilaa"],

      value: "Villa",
    },

    {
      keywords: ["flat", "apartment", "apt"],

      value: "Apartment / Flat",
    },

    {
      keywords: ["independent house", "independent", "house"],

      value: "Independent House",
    },

    {
      keywords: ["farm house", "farmhouse"],

      value: "Farm House",
    },

    {
      keywords: ["penthouse"],

      value: "Penthouse",
    },

    {
      keywords: ["studio"],

      value: "Studio Apartment",
    },

    {
      keywords: ["duplex", "triplex"],

      value: "Duplex / Triplex",
    },

    {
      keywords: ["builder floor"],

      value: "Builder Floor Apartment",
    },

    {
      keywords: ["serviced apartment"],

      value: "Serviced Apartment",
    },

    {
      keywords: ["townhouse", "row house"],

      value: "Row House / Townhouse",
    },
  ];

  for (const mapping of mappings) {
    const matched = mapping.keywords.some((keyword) => lower.includes(keyword));

    if (matched) {
      return mapping.value;
    }
  }

  return undefined;
}

// ============================================================
// BHK EXTRACTION
// ============================================================

export function extractBHK(message: string): string | undefined {
  const lower = normalizeText(message);

  const match = lower.match(/(\d+)\s*(bhk|bk|bedroom)/);

  if (!match) {
    return undefined;
  }

  return `${match[1]} BHK`;
}

// ============================================================
// FLOOR EXTRACTION
// ============================================================

export function extractFloorDetails(message: string): {
  floor_number?: number;
  total_floors?: number;
} {
  const lower = normalizeText(message);

  const fullPattern = lower.match(/(\d+)(st|nd|rd|th)?\s*floor.*?(\d+)\s*(floors|total)/);

  if (fullPattern) {
    return {
      floor_number: Number(fullPattern[1]),

      total_floors: Number(fullPattern[3]),
    };
  }

  const floorOnly = lower.match(/(\d+)(st|nd|rd|th)?\s*floor/);

  if (floorOnly) {
    return {
      floor_number: Number(floorOnly[1]),
    };
  }

  return {};
}

// ============================================================
// PARKING EXTRACTION
// ============================================================

export function extractParking(message: string): {
  parking_type?: string;
  parking_count?: string;
} {
  const lower = normalizeText(message);

  const result: {
    parking_type?: string;
    parking_count?: string;
  } = {};

  if (lower.includes("covered parking")) {
    result.parking_type = "Covered Parking";
  }

  if (lower.includes("open parking")) {
    result.parking_type = "Open Parking";
  }

  if (lower.includes("covered") && lower.includes("open")) {
    result.parking_type = "Both";
  }

  if (lower.includes("no parking")) {
    result.parking_type = "No Parking";
  }

  const countMatch = lower.match(/(\d+)\s*parking/);

  if (countMatch) {
    result.parking_count = countMatch[1];
  }

  return result;
}

// ============================================================
// MEASUREMENT EXTRACTION
// ============================================================

export function extractMeasurement(message: string): {
  value?: number;
  unit?: string;
} {
  const lower = normalizeText(message);

  const measurementMatch = lower.match(/(\d+(\.\d+)?)\s*(sqft|sq ft|sq yard|sqyd|acre|guntas?|cent|bigha)/);

  if (!measurementMatch) {
    return {};
  }

  let normalizedUnit = measurementMatch[3];

  normalizedUnit = normalizedUnit
    .replace("sqft", "Sq Ft")
    .replace("sq ft", "Sq Ft")
    .replace("sq yard", "Sq Yard")
    .replace("sqyd", "Sq Yard")
    .replace("gunta", "Gunta")
    .replace("guntas", "Gunta")
    .replace("acre", "Acre")
    .replace("cent", "Cent")
    .replace("bigha", "Bigha");

  return {
    value: Number(measurementMatch[1]),

    unit: normalizedUnit,
  };
}

// ============================================================
// PRICE EXTRACTION
// ============================================================

export function extractPricing(message: string): {
  price?: number;
  unit?: string;
} {
  const lower = normalizeText(message);

  // ==========================================================
  // CRORE
  // ==========================================================

  const croreMatch = lower.match(/(\d+(\.\d+)?)\s*crore/);

  if (croreMatch) {
    return {
      price: Number(croreMatch[1]) * 10000000,

      unit: "crore",
    };
  }

  // ==========================================================
  // LAKH
  // ==========================================================

  const lakhMatch = lower.match(/(\d+(\.\d+)?)\s*lakh/);

  if (lakhMatch) {
    return {
      price: Number(lakhMatch[1]) * 100000,

      unit: "lakh",
    };
  }

  // ==========================================================
  // THOUSAND
  // ==========================================================

  const thousandMatch = lower.match(/(\d+(\.\d+)?)\s*(thousand|k)/);

  if (thousandMatch) {
    return {
      price: Number(thousandMatch[1]) * 1000,

      unit: "thousand",
    };
  }

  // ==========================================================
  // RAW NUMBER
  // ==========================================================

  const numberMatch = lower.match(/\b\d{4,}\b/);

  if (numberMatch) {
    return {
      price: Number(numberMatch[0]),

      unit: "raw",
    };
  }

  return {};
}

// ============================================================
// FURNISHING EXTRACTION
// ============================================================

export function extractFurnishing(message: string): {
  furnishing_status?: string;
} {
  const lower = normalizeText(message);

  if (lower.includes("fully furnished")) {
    return {
      furnishing_status: "Fully Furnished",
    };
  }

  if (lower.includes("semi furnished")) {
    return {
      furnishing_status: "Semi Furnished",
    };
  }

  if (lower.includes("unfurnished")) {
    return {
      furnishing_status: "Unfurnished",
    };
  }

  return {};
}

// ============================================================
// MAIN EXTRACTION
// ============================================================

export function extractAll(message: string): ExtractionResult {
  const greeting = detectGreeting(message);

  const correction = detectCorrection(message);

  const intent = detectIntent(message);

  const listingType = extractListingType(message);

  const propertyType = extractPropertyType(message);

  const bhk = extractBHK(message);

  const pricing = extractPricing(message);

  const floorDetails = extractFloorDetails(message);

  const parking = extractParking(message);

  const measurement = extractMeasurement(message);

  const furnishing = extractFurnishing(message);

  // ==========================================================
  // FIELD MAPPING
  // ==========================================================

  const fields: Record<string, unknown> = {};

  // ==========================================================
  // LISTING TYPE
  // ==========================================================

  if (listingType) {
    fields.listing_type = listingType === "buy" ? "Buy" : "Rent";
  }

  // ==========================================================
  // PROPERTY TYPE
  // ==========================================================

  if (propertyType) {
    fields.property_type = propertyType;
  }

  // ==========================================================
  // BHK
  // ==========================================================

  if (bhk) {
    fields.bhk_type = bhk;
  }

  // ==========================================================
  // PRICE
  // ==========================================================

  if (pricing.price) {
    if (listingType === "rent") {
      fields.monthly_rent = pricing.price;
    } else {
      fields.total_price = pricing.price;
    }
  }

  // ==========================================================
  // FLOOR
  // ==========================================================

  if (floorDetails.floor_number) {
    fields.floor_number = floorDetails.floor_number;
  }

  if (floorDetails.total_floors) {
    fields.total_floors = floorDetails.total_floors;
  }

  // ==========================================================
  // PARKING
  // ==========================================================

  if (parking.parking_type) {
    fields.parking_type = parking.parking_type;
  }

  if (parking.parking_count) {
    fields.parking_count = parking.parking_count;
  }

  // ==========================================================
  // MEASUREMENT
  // ==========================================================

  if (measurement.value && measurement.unit) {
    fields.measurement_value = measurement.value;

    fields.measurement_unit = measurement.unit;
  }

  // ==========================================================
  // FURNISHING
  // ==========================================================

  if (furnishing.furnishing_status) {
    fields.furnishing_status = furnishing.furnishing_status;
  }

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  let confidence = 0;

  if (propertyType) confidence += 0.25;

  if (bhk) confidence += 0.2;

  if (pricing.price) confidence += 0.25;

  if (listingType) confidence += 0.2;

  if (measurement.value) confidence += 0.1;

  return {
    greeting,

    correction,

    intent,

    listingType,

    propertyType,

    bhk,

    price: pricing.price,

    priceUnit: pricing.unit,

    fields,

    confidence,
  };
}
