// ============================================================
// Upload Extraction Engine
//
// Responsibility:
//   - Parse uploaded files (images, brochures, PDFs) and
//     extract structured property data for the conversation
//     engine.
//
// NOTE: Scaffold only — no business logic implemented yet.
// ============================================================

export type UploadKind = "image" | "pdf" | "brochure";

export interface UploadInput {
  kind: UploadKind;
  url?: string;
  base64?: string;
  filename?: string;
}

export interface UploadExtractionResult {
  fields: Record<string, unknown>;
  rawText?: string;
  confidence?: number;
}

// ------------------------------------------------------------
// Public API (scaffold)
// ------------------------------------------------------------

export async function extractFromImage(_input: UploadInput): Promise<UploadExtractionResult> {
  return { fields: {} };
}

export async function extractFromPDF(_input: UploadInput): Promise<UploadExtractionResult> {
  return { fields: {} };
}

export async function extractFromBrochure(_input: UploadInput): Promise<UploadExtractionResult> {
  return { fields: {} };
}

export async function extractFromUpload(input: UploadInput): Promise<UploadExtractionResult> {
  switch (input.kind) {
    case "image":
      return extractFromImage(input);
    case "pdf":
      return extractFromPDF(input);
    case "brochure":
      return extractFromBrochure(input);
    default:
      return { fields: {} };
  }
}
