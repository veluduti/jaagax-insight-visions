import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { brandSchema, newBrand, brandCompliance, validateBrandAsset } from "./brandService";
describe("brand management safeguards", () => {
  it("preserves property overrides by default", () => expect(newBrand().governance.allow_overrides).toBe(true));
  it("rejects an invalid check-in time", () => expect(brandSchema.safeParse({ name: "My Brand", code: "MB", shared: { check_in: "29:00" } }).success).toBe(false));
  it("rejects unsafe website URLs", () => expect(brandSchema.safeParse({ name: "My Brand", code: "MB", website: "javascript:alert(1)" }).success).toBe(false));
  it("does not count unverified service standards as compliant", () => { const s = newBrand(); s.standards = { cleanliness: "Daily inspection" }; s.governance.use_branding = false; expect(brandCompliance({ type_details: {}, policies: {} } as any, s)).toEqual({ met: 0, total: 1 }); });
  it("counts matching saved policy values", () => { const s = newBrand(); s.policies = { pets: "No pets" }; s.governance.use_branding = false; expect(brandCompliance({ type_details: {}, policies: { pets: "No pets" } } as any, s)).toEqual({ met: 1, total: 1 }); });
  it("rejects executable SVG uploads", () => expect(() => validateBrandAsset({ type: "image/svg+xml", size: 100 })).toThrow());
  it("rejects files above 5 MB", () => expect(() => validateBrandAsset({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toThrow());
});