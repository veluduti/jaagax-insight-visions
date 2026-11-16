import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { checkinSchema, validateCheckinImage } from "./checkinService";
import { imageExtension } from "../../../supabase/functions/hotel-checkin-image/imageRules";
describe("check-in ID images", () => {
  it("allows only Aadhaar or passport document types", () => {
    for (const id_type of ["aadhaar", "passport"]) expect(checkinSchema.safeParse({ id_type, eta: "", requests: "" }).success).toBe(true);
    expect(checkinSchema.safeParse({ id_type: "driving_license", eta: "", requests: "" }).success).toBe(false);
  });
  it("rejects non-image files and accepts image types", () => {
    expect(validateCheckinImage({ type: "application/pdf", size: 100 })).toBeTruthy();
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(validateCheckinImage({ type, size: 100 })).toBeNull();
  });
  it("rejects renamed text files on the server", () => {
    expect(imageExtension(new TextEncoder().encode("123456789012"))).toBeNull();
    expect(imageExtension(new Uint8Array([255,216,255,0]))).toBe("jpg");
  });
  it("limits images to 5 MB", () => {
    expect(validateCheckinImage({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateCheckinImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBeTruthy();
  });
});