import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationRules {
  maxSizeBytes?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minFiles?: number;
  maxFiles?: number;
}

export const DEFAULT_PROPERTY_IMAGE_RULES: FileValidationRules = {
  maxSizeMB: 5,
  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  minWidth: 400,
  maxWidth: 8192,
  minHeight: 300,
  maxHeight: 8192,
};

export const DEFAULT_PROPERTY_DOCUMENT_RULES: FileValidationRules = {
  maxSizeMB: 10,
  allowedTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
};

export const DEFAULT_RERA_DOCUMENT_RULES: FileValidationRules = {
  maxSizeMB: 5,
  allowedTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
};

export const DEFAULT_PROFILE_IMAGE_RULES: FileValidationRules = {
  maxSizeMB: 2,
  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  minWidth: 200,
  maxWidth: 4096,
  minHeight: 200,
  maxHeight: 4096,
};

export const DEFAULT_VIDEO_RULES: FileValidationRules = {
  maxSizeMB: 100,
  allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
  allowedExtensions: [".mp4", ".webm", ".mov"],
};

/**
 * Validates a single file against the given rules.
 * Returns { valid: true } if all checks pass, or { valid: false, error: "…" } otherwise.
 */
export function validateFile(file: File, rules: FileValidationRules = {}): FileValidationResult {
  const { maxSizeBytes, maxSizeMB, allowedTypes, allowedExtensions, minWidth, maxWidth, minHeight, maxHeight } = rules;

  // Size check
  const sizeLimit = maxSizeBytes ?? (maxSizeMB ? maxSizeMB * 1024 * 1024 : undefined);
  if (sizeLimit !== undefined && file.size > sizeLimit) {
    return {
      valid: false,
      error: `File must be smaller than ${formatSize(sizeLimit)}`,
    };
  }

  // MIME type check
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split("/")[1]?.toUpperCase() ?? t).join(", ")}`,
      };
    }
  }

  // Extension check (fallback when MIME might be unreliable)
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Invalid extension. Allowed: ${allowedExtensions.join(", ")}`,
      };
    }
  }

  // Image dimension checks (async via promise; caller handles)
  if ((minWidth || maxWidth || minHeight || maxHeight) && file.type.startsWith("image/")) {
    // Return a placeholder; caller should use validateImageDimensions for async check
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Async image dimension validation.
 * Must be awaited / used inside an async flow.
 */
export function validateImageDimensions(
  file: File,
  rules: Pick<FileValidationRules, "minWidth" | "maxWidth" | "minHeight" | "maxHeight">,
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ valid: true });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { minWidth, maxWidth, minHeight, maxHeight } = rules;

      if (minWidth && img.width < minWidth) {
        resolve({ valid: false, error: `Image width must be at least ${minWidth}px` });
        return;
      }
      if (maxWidth && img.width > maxWidth) {
        resolve({ valid: false, error: `Image width must be at most ${maxWidth}px` });
        return;
      }
      if (minHeight && img.height < minHeight) {
        resolve({ valid: false, error: `Image height must be at least ${minHeight}px` });
        return;
      }
      if (maxHeight && img.height > maxHeight) {
        resolve({ valid: false, error: `Image height must be at most ${maxHeight}px` });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "Could not read image dimensions" });
    };

    img.src = url;
  });
}

/**
 * Validate multiple files (count + individual).
 * Returns { valid: false, error: "…", files: [] } on first failure,
 * or { valid: true, files: validatedFiles } on success.
 */
export interface MultiFileValidationResult {
  valid: boolean;
  error?: string;
  files: File[];
}

export function validateMultipleFiles(
  files: FileList | null | undefined,
  rules: FileValidationRules = {},
): MultiFileValidationResult {
  if (!files || files.length === 0) {
    return { valid: false, error: "No files selected", files: [] };
  }

  const fileArray = Array.from(files);

  if (rules.minFiles !== undefined && fileArray.length < rules.minFiles) {
    return { valid: false, error: `Select at least ${rules.minFiles} file(s)`, files: [] };
  }

  if (rules.maxFiles !== undefined && fileArray.length > rules.maxFiles) {
    return { valid: false, error: `Select at most ${rules.maxFiles} file(s)`, files: [] };
  }

  for (const file of fileArray) {
    const result = validateFile(file, rules);
    if (!result.valid) {
      return { valid: false, error: `"${file.name}": ${result.error}`, files: [] };
    }
  }

  return { valid: true, files: fileArray };
}

/**
 * Convenience wrapper that shows toast on failure.
 * Returns the validated file or null.
 */
export function validateFileWithToast(file: File, rules: FileValidationRules = {}): File | null {
  const result = validateFile(file, rules);
  if (!result.valid) {
    toast.error(result.error || "Invalid file");
    return null;
  }
  return file;
}

/**
 * Convenience wrapper for multiple files with toast.
 */
export function validateMultipleFilesWithToast(
  files: FileList | null | undefined,
  rules: FileValidationRules = {},
): File[] | null {
  const result = validateMultipleFiles(files, rules);
  if (!result.valid) {
    toast.error(result.error || "Invalid file selection");
    return null;
  }
  return result.files;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

// ============================================
// PROPERTY RELEVANCE VALIDATION
// ============================================

export interface PropertyRelevanceResult {
  valid: boolean;
  confidence: number;
  reason?: string;
  documentType?: string;
}

const PROPERTY_KEYWORDS = [
  "apartment",
  "villa",
  "flat",
  "plot",
  "office",
  "commercial",
  "layout",
  "brochure",
  "property",
  "real estate",
  "bhk",
  "sq ft",
  "sqyd",
  "floor plan",
  "tower",
  "amenities",
  "elevation",
  "project",
  "kitchen",
  "bedroom",
  "hall",
  "balcony",
  "bathroom",
  "parking",
  "site plan",
  "master plan",
];

async function aiValidate(payload: {
  image_url?: string;
  image_base64?: string;
  text?: string;
}): Promise<PropertyRelevanceResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "ai-validate-property-content",
      { body: payload },
    );
    if (error) {
      console.warn("[validate] ai-validate-property-content error", error);
      return null;
    }
    if (!data || typeof data !== "object") return null;
    return {
      valid: !!(data as any).valid,
      confidence: typeof (data as any).confidence === "number" ? (data as any).confidence : 0,
      reason: (data as any).reason,
      documentType: (data as any).documentType,
    };
  } catch (e) {
    console.warn("[validate] ai validator failed", e);
    return null;
  }
}

function keywordRelevance(extractedText: string): PropertyRelevanceResult {
  const text = (extractedText || "").toLowerCase();
  let matches = 0;
  for (const k of PROPERTY_KEYWORDS) if (text.includes(k)) matches++;
  const confidence = matches / PROPERTY_KEYWORDS.length;
  if (confidence < 0.08) {
    return {
      valid: false,
      confidence,
      reason: "This file doesn't appear related to a property listing.",
      documentType: "unknown",
    };
  }
  return { valid: true, confidence, documentType: "property_document" };
}

export async function validatePropertyRelevance(
  extractedText: string,
): Promise<PropertyRelevanceResult> {
  // Try AI first
  if (extractedText && extractedText.trim().length > 20) {
    const ai = await aiValidate({ text: extractedText });
    if (ai) return ai;
  }
  // Fallback: keyword heuristic
  return keywordRelevance(extractedText || "");
}

// ============================================
// VALIDATE PROPERTY IMAGE CONTENT (AI Vision)
// ============================================

export async function validatePropertyImage(
  imageUrlOrBase64: string,
): Promise<PropertyRelevanceResult> {
  try {
    if (!imageUrlOrBase64 || imageUrlOrBase64.length < 50) {
      return { valid: false, confidence: 0, reason: "Empty image", documentType: "unknown" };
    }
    const isDataUrl = imageUrlOrBase64.startsWith("data:");
    const ai = await aiValidate(
      isDataUrl ? { image_base64: imageUrlOrBase64 } : { image_url: imageUrlOrBase64 },
    );
    if (ai) return ai;
    // Fail-open if validator unreachable so uploads aren't blocked.
    return { valid: true, confidence: 0, reason: "validator unavailable", documentType: "unknown" };
  } catch (e) {
    return { valid: true, confidence: 0, reason: "validator error", documentType: "unknown" };
  }
}


// ============================================
// VALIDATE USER MESSAGE RELEVANCE
// ============================================

export function validatePropertyText(text: string) {
  const keywords = [
    "bhk",
    "sqft",
    "sq ft",
    "square feet",
    "apartment",
    "flat",
    "villa",
    "house",
    "plot",
    "land",
    "commercial",
    "office",
    "shop",
    "rent",
    "sale",
    "buy",
    "price",
    "cr",
    "crore",
    "lakh",
    "facing",
    "furnished",
    "bathroom",
    "balcony",
    "parking",
    "hyderabad",
    "kondapur",
    "gachibowli",
    "property",
  ];

  const lower = text.toLowerCase();

  const matched = keywords.filter((k) => lower.includes(k));

  return {
    valid: matched.length > 0,
    confidence: matched.length / keywords.length,
  };
}

export default {
  validateFile,
  validateImageDimensions,
  validateMultipleFiles,
  validateFileWithToast,
  validateMultipleFilesWithToast,
  DEFAULT_PROPERTY_IMAGE_RULES,
  DEFAULT_PROPERTY_DOCUMENT_RULES,
  DEFAULT_RERA_DOCUMENT_RULES,
  DEFAULT_PROFILE_IMAGE_RULES,
  DEFAULT_VIDEO_RULES,
};
