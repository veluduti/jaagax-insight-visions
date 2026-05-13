// ============================================================
// Natural Language Extraction Engine
//
// Responsibility:
//   - Detect greetings, intents, and structured property fields
//     from free-form user messages.
//   - Provide deterministic, lightweight parsing that the
//     conversation engine can consume before falling back to AI.
//
// NOTE: Scaffold only — no business logic implemented yet.
// ============================================================

import type { PropertyCategory } from "@/engines/types";

// ------------------------------------------------------------
// Types
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
// Public API (scaffold)
// ------------------------------------------------------------

export function detectGreeting(_message: string): boolean {
  return false;
}

export function detectIntent(_message: string): string | undefined {
  return undefined;
}

export function extractListingType(_message: string): ListingType | undefined {
  return undefined;
}

export function extractPropertyType(_message: string): string | undefined {
  return undefined;
}

export function extractBHK(_message: string): string | undefined {
  return undefined;
}

export function extractPricing(_message: string): { price?: number; unit?: string } {
  return {};
}

export function extractAll(_message: string): ExtractionResult {
  return {};
}
