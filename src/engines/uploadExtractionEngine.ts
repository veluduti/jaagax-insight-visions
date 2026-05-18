// ============================================================
// ADVANCED UPLOAD EXTRACTION ENGINE
// Pipeline:
//   upload (image | pdf | brochure | screenshot)
//     -> OCR / Vision (edge functions)
//     -> normalized raw text + AI structured fields
//     -> NLP extractor.ts (fallback enrichment)
//     -> flow-aligned field map
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { extractAll } from "./extractor";

// ============================================================
// TYPES
// ============================================================

export type UploadKind = "image" | "pdf" | "brochure" | "screenshot";

export interface UploadInput {
  kind: UploadKind;
  url?: string;          // Public URL of uploaded file
  base64?: string;       // data:<mime>;base64,xxx
  filename?: string;
  extractedText?: string; // Pre-extracted text (skip OCR)
}

export interface UploadExtractionResult {
  fields: Record<string, unknown>;
  rawText?: string;
  confidence?: number;
  detectedCategory?: string;
  detectedPropertyType?: string;
}

// ============================================================
// HELPERS
// ============================================================

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pickImageSource(input: UploadInput): string | undefined {
  if (input.base64) return input.base64;
  if (input.url) return input.url;
  return undefined;
}

// ------------------------------------------------------------
// PDF text extraction via edge function
// ------------------------------------------------------------

async function extractPdfText(input: UploadInput): Promise<string> {
  try {
    const payload: Record<string, unknown> = {};
    if (input.url) payload.url = input.url;
    if (input.base64) payload.data_url = input.base64;

    const { data, error } = await supabase.functions.invoke("extract-pdf-text", {
      body: payload,
    });
    if (error) {
      console.warn("[uploadExtraction] extract-pdf-text error", error);
      return "";
    }
    const text = (data as any)?.text || (data as any)?.rawText || "";
    return normalizeText(String(text || ""));
  } catch (e) {
    console.warn("[uploadExtraction] extract-pdf-text failed", e);
    return "";
  }
}

// ------------------------------------------------------------
// Raw text extraction (multi-source)
// ------------------------------------------------------------

async function extractRawText(input: UploadInput): Promise<string> {
  if (input.extractedText) return normalizeText(input.extractedText);
  if (input.kind === "pdf" || input.kind === "brochure") {
    return await extractPdfText(input);
  }
  // Images / screenshots: text comes via Vision in ai-extract-property.
  return "";
}

// ------------------------------------------------------------
// AI Vision / structured extraction via edge function
// ------------------------------------------------------------

async function aiExtractStructured(
  text: string,
  imageUrl?: string,
): Promise<Record<string, any> | null> {
  if (!text && !imageUrl) return null;
  try {
    const { data, error } = await supabase.functions.invoke("ai-extract-property", {
      body: { text, image_url: imageUrl },
    });
    if (error) {
      console.warn("[uploadExtraction] ai-extract-property error", error);
      return null;
    }
    return ((data as any)?.extracted || null) as Record<string, any> | null;
  } catch (e) {
    console.warn("[uploadExtraction] ai-extract-property failed", e);
    return null;
  }
}

// ------------------------------------------------------------
// Map AI extraction to residential/commercial/plot flow field IDs
// ------------------------------------------------------------

const SUBTYPE_TO_PROPERTY_TYPE: Record<string, string> = {
  Flat: "Apartment / Flat",
  Apartment: "Apartment / Flat",
  Villa: "Villa",
  "Independent House": "Independent House",
  "Row House": "Row House / Townhouse",
  Penthouse: "Penthouse",
  Plot: "Plot",
  "Farm Land": "Farm House",
};

const PURPOSE_TO_LISTING_TYPE: Record<string, string> = {
  Sale: "Sell",
  Rent: "Rent",
  Lease: "Rent",
};

function mapAiToFlowFields(ai: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Property type
  if (ai.sub_type && SUBTYPE_TO_PROPERTY_TYPE[ai.sub_type]) {
    out.property_type = SUBTYPE_TO_PROPERTY_TYPE[ai.sub_type];
  } else if (ai.type === "RESIDENTIAL") {
    out.property_type = "Apartment / Flat";
  }

  // Listing type
  if (ai.purpose && PURPOSE_TO_LISTING_TYPE[ai.purpose]) {
    out.listing_type = PURPOSE_TO_LISTING_TYPE[ai.purpose];
  }

  // BHK
  if (ai.bhk) out.bhk_type = `${ai.bhk} BHK`;

  // Area
  if (ai.built_up_area) {
    if (ai.area_unit === "acre" || ai.area_unit === "gunta" || ai.area_unit === "cent") {
      out.land_size = ai.built_up_area;
    } else if (ai.sub_type === "Plot") {
      out.land_size = ai.built_up_area;
    } else {
      out.flat_size = ai.built_up_area;
      out.built_area = ai.built_up_area;
    }
    out.unit_type = ai.area_unit || "sq ft";
  }

  // Price
  if (typeof ai.price === "number") {
    if (out.listing_type === "Rent") out.monthly_rent = ai.price;
    else out.total_price = ai.price;
  }
  if (typeof ai.price_per_unit === "number") out.price_per_unit = ai.price_per_unit;

  // Furnishing
  if (ai.furnishing) out.furnishing_status = ai.furnishing;

  // Bathrooms / parking
  if (ai.bathrooms) out.bathroom_count = ai.bathrooms;
  if (ai.car_parking) {
    out.parking_count = ai.car_parking;
    out.parking_type = "Covered Parking";
  }

  // Project / location
  if (ai.project_name) out.project_name = ai.project_name;
  if (ai.location) out.location = ai.location;
  if (ai.city) out.city = ai.city;

  // Facing
  if (Array.isArray(ai.facing) && ai.facing.length) {
    out.property_facing = ai.facing[0];
  } else if (typeof ai.facing === "string") {
    out.property_facing = ai.facing;
  }

  // Approvals
  if (Array.isArray(ai.approval) && ai.approval.length) {
    out.approvals = ai.approval;
  } else if (typeof ai.approval === "string") {
    out.approvals = [ai.approval];
  }

  // Amenities
  if (Array.isArray(ai.amenities) && ai.amenities.length) {
    out.amenities = ai.amenities;
  }

  // Contact
  if (ai.contact_name) out.contact_name = ai.contact_name;
  if (ai.contact_phone) {
    out.mobile_number = String(ai.contact_phone).replace(/\D/g, "").slice(-10);
  }

  // Title / description
  if (ai.title) out.property_highlights = ai.title;

  return out;
}

// ============================================================
// MAIN PIPELINE
// ============================================================

async function runExtraction(input: UploadInput): Promise<UploadExtractionResult> {
  const imageSource =
    input.kind === "image" || input.kind === "screenshot"
      ? pickImageSource(input)
      : undefined;

  // 1) Raw text (PDF/brochure -> OCR; image -> empty, Vision handles it)
  const rawText = await extractRawText(input);

  // 2) AI structured extraction (Vision for image, text for PDF)
  const aiStructured = await aiExtractStructured(rawText, imageSource);

  // 3) NLP fallback / enrichment from raw text
  const nlp = rawText ? extractAll(rawText) : { fields: {}, confidence: 0 };

  // 4) Merge — AI wins, NLP fills gaps
  const flowFromAi = aiStructured ? mapAiToFlowFields(aiStructured) : {};
  const merged: Record<string, unknown> = { ...(nlp.fields || {}) };
  for (const [k, v] of Object.entries(flowFromAi)) {
    if (v !== undefined && v !== null && v !== "") merged[k] = v;
  }

  // 5) Confidence
  let confidence = nlp.confidence || 0;
  if (aiStructured) confidence = Math.max(confidence, 0.85);
  if (Object.keys(merged).length >= 5) confidence = Math.max(confidence, 0.9);

  // 6) Detected category / property type
  let detectedCategory: string | undefined;
  if (aiStructured?.type === "RESIDENTIAL") detectedCategory = "residential";
  else if (aiStructured?.type === "COMMERCIAL") detectedCategory = "commercial";
  else if (aiStructured?.type === "LAND") detectedCategory = "plots";
  if (!detectedCategory && nlp.category) detectedCategory = String(nlp.category);

  return {
    fields: merged,
    rawText,
    confidence,
    detectedCategory,
    detectedPropertyType:
      (merged.property_type as string | undefined) ||
      aiStructured?.sub_type ||
      nlp.propertyType,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

export async function extractFromImage(input: UploadInput) {
  return runExtraction({ ...input, kind: "image" });
}

export async function extractFromPDF(input: UploadInput) {
  return runExtraction({ ...input, kind: "pdf" });
}

export async function extractFromBrochure(input: UploadInput) {
  return runExtraction({ ...input, kind: "brochure" });
}

export async function extractFromScreenshot(input: UploadInput) {
  return runExtraction({ ...input, kind: "screenshot" });
}

export async function extractFromUpload(
  input: UploadInput,
): Promise<UploadExtractionResult> {
  switch (input.kind) {
    case "image":
      return extractFromImage(input);
    case "screenshot":
      return extractFromScreenshot(input);
    case "pdf":
      return extractFromPDF(input);
    case "brochure":
      return extractFromBrochure(input);
    default:
      return { fields: {}, confidence: 0 };
  }
}
