import { describe, expect, it } from "vitest";
import { matchesDocumentSignature, validateDocumentReview, validateLeadDocument } from "./leadDocuments";

describe("private lead documents", () => {
  it("accepts supported image and PDF formats", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) expect(() => validateLeadDocument({ size: 100, type, name: "document" })).not.toThrow();
  });
  it("caps uploads at 10 MB", () => {
    expect(() => validateLeadDocument({ size: 10485760, type: "application/pdf", name: "proof.pdf" })).not.toThrow();
    expect(() => validateLeadDocument({ size: 10485761, type: "application/pdf", name: "proof.pdf" })).toThrow();
  });
  it("rejects empty files", () => expect(() => validateLeadDocument({ size: 0, type: "image/png", name: "proof.png" })).toThrow());
  it("rejects active HTML and SVG documents", () => {
    for (const type of ["text/html", "image/svg+xml", "application/javascript"]) expect(() => validateLeadDocument({ size: 100, type, name: "proof" })).toThrow();
  });
  it("requires signatures matching the selected format", () => {
    expect(matchesDocumentSignature("application/pdf", new Uint8Array([37, 80, 68, 70, 45]))).toBe(true);
    expect(matchesDocumentSignature("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(matchesDocumentSignature("image/jpeg", new Uint8Array([255, 216, 255]))).toBe(true);
    expect(matchesDocumentSignature("image/webp", new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).toBe(true);
    expect(matchesDocumentSignature("image/png", new Uint8Array([37, 80, 68, 70, 45]))).toBe(false);
  });
  it("requires a rejection reason", () => {
    expect(() => validateDocumentReview("rejected", " ")).toThrow();
    expect(() => validateDocumentReview("rejected", "Image is unreadable")).not.toThrow();
  });
});