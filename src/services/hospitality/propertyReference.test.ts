import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ insert: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mock.insert }) } }));
import { createDraftProperty, draftPropertySchema } from "./portfolioService";

describe("automatic Property ID inputs", () => {
  it("saves PG as the selected category before the database assigns its PG reference", async () => {
    mock.single.mockResolvedValue({ data: { id: "499a4ed2-70b9-49e6-a666-fc3321738e4a" }, error: null });
    mock.insert.mockReturnValue({ select: () => ({ single: mock.single }) });
    await createDraftProperty("c43bdf39-067a-4263-a947-7f9f8c24bdd1", { name: "PG", city: "Hyderabad", business_id: null, property_type: "pg", property_reference: "JGX-PG-349834" });
    const payload = mock.insert.mock.calls[mock.insert.mock.calls.length - 1]?.[0];
    expect(payload.business_types).toEqual(["pg"]);
    expect(payload).not.toHaveProperty("property_reference");
  });
  it("saves Hotel as the selected category before the database assigns its HOT reference", async () => {
    mock.single.mockResolvedValue({ data: { id: "499a4ed2-70b9-49e6-a666-fc3321738e4a" }, error: null });
    mock.insert.mockReturnValue({ select: () => ({ single: mock.single }) });
    await createDraftProperty("c43bdf39-067a-4263-a947-7f9f8c24bdd1", { name: "Hotel", city: "Hyderabad", business_id: null, property_type: "hotel" });
    expect(mock.insert.mock.calls[mock.insert.mock.calls.length - 1]?.[0].business_types).toEqual(["hotel"]);
  });
  it("rejects unrecognized property types rather than silently assigning a hotel identity", () => {
    expect(draftPropertySchema.safeParse({ name: "Property", city: "Hyderabad", business_id: null, property_type: "invalid" }).success).toBe(false);
  });
});