export const LEAD_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const LEAD_DOCUMENT_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type LeadDocumentStatus = "uploaded" | "verified" | "rejected";

export function validateLeadDocument(file: { size: number; type: string; name: string }) {
  if (!file.size) throw new Error("Choose a non-empty file.");
  if (file.size > LEAD_DOCUMENT_MAX_BYTES) throw new Error("Files must be 10 MB or smaller.");
  if (!LEAD_DOCUMENT_MIMES.some(mime => mime === file.type)) throw new Error("Choose a JPG, PNG, WebP image or PDF.");
  if (!file.name.trim() || file.name.length > 200) throw new Error("Use a filename of 200 characters or fewer.");
}

export function matchesDocumentSignature(type: string, bytes: Uint8Array) {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  if (type === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (type === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (type === "application/pdf") return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (type === "image/webp") return starts(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((v, i) => bytes[i + 8] === v);
  return false;
}

export function validateDocumentReview(status: LeadDocumentStatus, note: string) {
  if (!["uploaded", "verified", "rejected"].includes(status)) throw new Error("Choose a valid review status.");
  if (note.length > 1000) throw new Error("Review notes must be 1,000 characters or fewer.");
  if (status === "rejected" && !note.trim()) throw new Error("Add a reason for rejecting this document.");
}