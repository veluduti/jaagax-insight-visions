import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { wizardSchema, validateSetupDocument, wizardReadiness, wizardValidationIssues } from "./propertySetupService";
const completeForm = () => ({
  property: { business_types: ["hotel"], name: "Hotel", description: "Description", city: "City", locality: "Area", address: "Address", state: "State", country: "India", star_rating: null, contact_email: "guest@example.com", contact_phone: "1234567890", latitude: 17, longitude: 78, images: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"], amenities: ["wifi"], policies: { guest_rules: "ID required" }, check_in_time: "14:00", check_out_time: "11:00", summary: "", brand_name: "", property_code: "", website: "" },
  business: { owner_name: "Owner", legal_name: "Business", entity_type: "Individual", cin: "", registered_address: "", gst_number: "", pan_number: "" },
  documents: { business_registration_url: "owner/business.pdf", identity_proof_url: "owner/id.pdf", cancelled_cheque_url: "owner/cheque.pdf" },
  bank: { account_holder_name: "Owner", bank_name: "Bank", account_number: "123456789012", ifsc_code: "BKID0003232", upi_id: "", account_type: "Current" as const },
  settings: { step: 0, notes: "", require_manual_review: true, publish_after_approval: true },
});
describe("property setup safety", () => {
  it("rejects executable uploads and documents above 10 MB", () => { expect(() => validateSetupDocument({ type: "text/html", size: 100 })).toThrow(); expect(() => validateSetupDocument({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toThrow(); expect(() => validateSetupDocument({ type: "application/pdf", size: 100 })).not.toThrow(); });
  it("rejects invalid PAN and GSTIN rather than declaring them verified", () => { const b = wizardSchema.shape.business; expect(b.safeParse({ owner_name: "Owner", legal_name: "Business", entity_type: "", cin: "", registered_address: "", pan_number: "bad", gst_number: "" }).success).toBe(false); });
  it("requires three photos and real priced inventory, not a completion flag", () => {
    const f = completeForm(); f.property.images.pop();
    expect(wizardReadiness(f, { rooms: [], services: [] } as any)[4]).toBe(false); f.property.images.push("https://example.com/3.jpg"); expect(wizardReadiness(f, { rooms: [], services: [] } as any)[4]).toBe(true); expect(wizardReadiness(f, { rooms: [], services: [] } as any)[5]).toBe(false);
  });
  it("normalizes lowercase and padded bank codes before sending to the save RPC", () => {
    const f = completeForm(); f.bank.ifsc_code = " bkid0003232 ";
    expect(wizardSchema.parse(f).bank.ifsc_code).toBe("BKID0003232");
    expect(wizardValidationIssues(f)).toEqual([]);
  });
  it("does not declare bank setup complete when the IFSC has only ten characters", () => {
    const f = completeForm(); f.bank.ifsc_code = "Bkid003232";
    const overview: any = { rooms: [{ is_active: true, total_units: 1, base_price: 1000 }], services: [] };
    expect(wizardReadiness(f, overview)[8]).toBe(false);
    expect(wizardValidationIssues(f).map(i => ({ path: i.path, step: i.step }))).toEqual([{ path: "bank.ifsc_code", step: 8 }]);
    expect(wizardSchema.safeParse(f).success).toBe(false);
  });
  it("normalizes tax codes but still rejects invalid formats", () => {
    const f = completeForm(); f.business.pan_number = " abcde1234f "; f.business.gst_number = " 27abcde1234f1z5 ";
    const parsed = wizardSchema.parse(f);
    expect(parsed.business.pan_number).toBe("ABCDE1234F");
    expect(parsed.business.gst_number).toBe("27ABCDE1234F1Z5");
    f.business.gst_number = "27bad";
    expect(wizardValidationIssues(f).some(i => i.path === "business.gst_number" && i.step === 2)).toBe(true);
  });
  it("marks a malformed optional website incomplete instead of showing all sections complete", () => {
    const f = completeForm(); f.property.website = "example.com";
    expect(wizardValidationIssues(f).some(i => i.path === "property.website")).toBe(true);
    expect(wizardReadiness(f, { rooms: [], services: [] } as any)[3]).toBe(false);
  });
});