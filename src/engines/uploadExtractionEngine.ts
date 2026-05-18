// ============================================================
// ADVANCED UPLOAD EXTRACTION ENGINE
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// ============================================================

import { extractAll } from "./extractor";

// ============================================================
// TYPES
// ============================================================

export type UploadKind = "image" | "pdf" | "brochure";

// ============================================================
// INPUT
// ============================================================

export interface UploadInput {
  kind: UploadKind;

  url?: string;

  base64?: string;

  filename?: string;

  extractedText?: string;
}

// ============================================================
// RESULT
// ============================================================

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

// ============================================================
// RAW TEXT EXTRACTION
// MOCK IMPLEMENTATION
// ============================================================

async function extractRawText(input: UploadInput): Promise<string> {
  // ==========================================================
  // FUTURE:
  // - OCR
  // - Gemini Vision
  // - OpenAI Vision
  // - PDF Parsing
  // ==========================================================

  if (input.extractedText) {
    return normalizeText(input.extractedText);
  }

  return "";
}

// ============================================================
// GENERIC EXTRACTION
// ============================================================

async function runExtraction(input: UploadInput): Promise<UploadExtractionResult> {
  const rawText = await extractRawText(input);

  // ==========================================================
  // NO TEXT
  // ==========================================================

  if (!rawText) {
    return {
      fields: {},

      rawText: "",

      confidence: 0,
    };
  }

  // ==========================================================
  // NLP EXTRACTION
  // ==========================================================

  const extracted = extractAll(rawText);

  return {
    fields: extracted.fields || {},

    rawText,

    confidence: extracted.confidence || 0,

    detectedCategory: extracted.category,

    detectedPropertyType: extracted.propertyType,
  };
}

// ============================================================
// IMAGE EXTRACTION
// ============================================================

export async function extractFromImage(input: UploadInput): Promise<UploadExtractionResult> {
  return runExtraction({
    ...input,

    kind: "image",
  });
}

// ============================================================
// PDF EXTRACTION
// ============================================================

export async function extractFromPDF(input: UploadInput): Promise<UploadExtractionResult> {
  return runExtraction({
    ...input,

    kind: "pdf",
  });
}

// ============================================================
// BROCHURE EXTRACTION
// ============================================================

export async function extractFromBrochure(input: UploadInput): Promise<UploadExtractionResult> {
  return runExtraction({
    ...input,

    kind: "brochure",
  });
}

// ============================================================
// UNIVERSAL EXTRACTION
// ============================================================

export async function extractFromUpload(input: UploadInput): Promise<UploadExtractionResult> {
  switch (input.kind) {
    case "image":
      return extractFromImage(input);

    case "pdf":
      return extractFromPDF(input);

    case "brochure":
      return extractFromBrochure(input);

    default:
      return {
        fields: {},

        confidence: 0,
      };
  }
}
