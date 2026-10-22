import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/propertyService", () => ({ PROPERTY_CARD_COLUMNS: "id", toPublicRow: (p: any) => p }));
vi.mock("@/services/searchService", () => ({ searchPropertiesNearby: vi.fn(async () => [
  { id: "near", title: "Live flat", city: "Medchal", verified: true, is_live: true, distance_km: 8 },
  { id: "pending", verified: false, is_live: false, distance_km: 2 },
  { id: "far", verified: true, is_live: true, distance_km: 26 },
]) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const q: Record<string, any> = {};
  for (const method of ["select", "eq", "in", "limit"]) q[method] = () => q;
  q.then = (resolve: any) => Promise.resolve({ error: null, data: table === "travel_experiences" ? [
    { title: "Local craft walk", city: "Hyderabad", category: "culture", status: "approved" },
    { title: "Wrong city", city: "Mumbai", category: "culture", status: "approved" },
    { title: "Unapproved", city: "Hyderabad", category: "culture", status: "pending" },
  ] : [
    { id: "legacy", title: "Legacy flat", city: "Hyderabad", verified: true, is_live: true, latitude: null, longitude: null },
    { id: "wrong", city: "Mumbai", verified: true, is_live: true },
    { id: "pinned-far", city: "Hyderabad", verified: true, is_live: true, latitude: 18, longitude: 79 },
  ] }).then(resolve);
  return q;
} } }));

import { getDestinationRecommendations } from "@/services/smartStayRecommendationService";

describe("Smart Stays real destination discovery", () => {
  it("matches approved local experiences to the itinerary destination only", async () => {
    const result = await getDestinationRecommendations("Secunderabad");
    expect(result.places.some(p => p.name === "Local craft walk")).toBe(true);
    expect(result.places.some(p => ["Wrong city", "Unapproved"].includes(p.name))).toBe(false);
  });
  it("combines approved nearby pins with only pinless same-city listings", async () => {
    const result = await getDestinationRecommendations("Hyderabad");
    expect(result.properties.map(p => p.id)).toEqual(["near", "legacy"]);
    expect(result.propertyError).toBe(false);
  });
});