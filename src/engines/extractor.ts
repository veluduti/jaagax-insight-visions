// ============================================================
// Natural Language Extraction Engine
//
// Responsibility:
//   - Detect greetings
//   - Detect listing intent
//   - Extract structured property data
//   - Provide deterministic parsing
//
// Deterministic:
//   AI can enhance later,
//   but workflow NEVER depends on AI.
// ============================================================

import type { PropertyCategory } from "@/engines/types";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type ListingType = "buy" | "rent";

export interface ExtractionResult {
  greeting?: boolean;

  intent?: string;

  category?: PropertyCategory;

  propertyType?: string;

  listingType?: ListingType;

  bhk?: string;

  price?: number;

  priceUnit?: string;

  fields?: Record<string, unknown>;
}

// ------------------------------------------------------------
// GREETING DETECTION
// ------------------------------------------------------------

export function detectGreeting(message: string): boolean {
  const lower = message.trim().toLowerCase();

  const greetings = ["hi", "hello", "hey", "good morning", "good evening"];

  return greetings.some((greeting) => lower.includes(greeting));
}

// ------------------------------------------------------------
// INTENT DETECTION
// ------------------------------------------------------------

export function detectIntent(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (lower.includes("sell")) {
    return "sell_property";
  }

  if (lower.includes("rent")) {
    return "rent_property";
  }

  if (lower.includes("buy")) {
    return "buy_property";
  }

  return undefined;
}

// ------------------------------------------------------------
// LISTING TYPE
// ------------------------------------------------------------

export function extractListingType(message: string): ListingType | undefined {
  const lower = message.toLowerCase();

  if (lower.includes("sell")) {
    return "buy";
  }

  if (lower.includes("rent")) {
    return "rent";
  }

  return undefined;
}

// ------------------------------------------------------------
// PROPERTY TYPE
// ------------------------------------------------------------

export function extractPropertyType(message: string): string | undefined {
  const lower = message.toLowerCase();

  const mappings = [
    {
      keywords: ["villa"],

      value: "Villa",
    },

    {
      keywords: ["flat", "apartment"],

      value: "Apartment / Flat",
    },

    {
      keywords: ["house"],

      value: "Independent House",
    },

    {
      keywords: ["farm house"],

      value: "Farm House",
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

// ------------------------------------------------------------
// BHK EXTRACTION
// ------------------------------------------------------------

export function extractBHK(message: string): string | undefined {
  const lower = message.toLowerCase();

  const match = lower.match(/(\d+)\s*bhk/);

  if (!match) {
    return undefined;
  }

  return `${match[1]} BHK`;
}

// ------------------------------------------------------------
// PRICE EXTRACTION
// ------------------------------------------------------------

export function extractPricing(message: string): {
  price?: number;
  unit?: string;
} {
  const lower = message.toLowerCase();

  // =========================================================
  // CRORE
  // =========================================================

  const croreMatch = lower.match(/(\d+(\.\d+)?)\s*crore/);

  if (croreMatch) {
    return {
      price: Number(croreMatch[1]) * 10000000,

      unit: "crore",
    };
  }

  // =========================================================
  // LAKH
  // =========================================================

  const lakhMatch = lower.match(/(\d+(\.\d+)?)\s*lakh/);

  if (lakhMatch) {
    return {
      price: Number(lakhMatch[1]) * 100000,

      unit: "lakh",
    };
  }

  // =========================================================
  // RAW NUMBER
  // =========================================================

  const numberMatch = lower.match(/\b\d{4,}\b/);

  if (numberMatch) {
    return {
      price: Number(numberMatch[0]),

      unit: "raw",
    };
  }

  return {};
}

// ------------------------------------------------------------
// MAIN EXTRACTION
// ------------------------------------------------------------

export function extractAll(message: string): ExtractionResult {
  const greeting = detectGreeting(message);

  const intent = detectIntent(message);

  const listingType = extractListingType(message);

  const propertyType = extractPropertyType(message);

  const bhk = extractBHK(message);

  const pricing = extractPricing(message);

  // =========================================================
  // FIELD MAPPING
  // =========================================================

  const fields: Record<string, unknown> = {};

  if (listingType) {
    fields.listing_type = listingType === "buy" ? "Buy" : "Rent";
  }

  if (propertyType) {
    fields.property_type = propertyType;
  }

  if (bhk) {
    fields.bhk_type = bhk;
  }

  if (pricing.price) {
    fields.total_price = pricing.price;
  }

  return {
    greeting,

    intent,

    listingType,

    propertyType,

    bhk,

    price: pricing.price,

    priceUnit: pricing.unit,

    fields,
  };
}
