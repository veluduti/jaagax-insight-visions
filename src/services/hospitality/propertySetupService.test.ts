import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { wizardSchema, validateSetupDocument, wizardReadiness } from "./propertySetupService";
describe("property setup safety", () => {
  it("rejects executable uploads and documents above 10 MB", () => { expect(() => validateSetupDocument({ type: "text/html", size: 100 })).toThrow(); expect(() => validateSetupDocument({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toThrow(); expect(() => validateSetupDocument({ type: "application/pdf", size: 100 })).not.toThrow(); });
  it("rejects invalid PAN and GSTIN rather than declaring them verified", () => { const b = wizardSchema.shape.business; expect(b.safeParse({ owner_name: "Owner", legal_name: "Business", entity_type: "", cin: "", registered_address: "", pan_number: "bad", gst_number: "" }).success).toBe(false); });
  it("requires three photos and real priced inventory, not a completion flag", () => {
    const f: any = { property: { business_types: ["hotel"], name: "Hotel", description: "Description", city: "City", address: "Address", contact_email: "guest@example.com", contact_phone: "1234567890", latitude: 17, longitude: 78, images: ["a", "b"], amenities: [], policies: {}, check_in_time: "", check_out_time: "" }, business: { owner_name: "", legal_name: "" }, documents: {}, bank: {} };
    expect(wizardReadiness(f, { rooms: [], services: [] } as any)[4]).toBe(false); f.property.images.push("c"); expect(wizardReadiness(f, { rooms: [], services: [] } as any)[4]).toBe(true); expect(wizardReadiness(f, { rooms: [], services: [] } as any)[5]).toBe(false);
  });
});