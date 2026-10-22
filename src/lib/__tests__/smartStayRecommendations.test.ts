import { describe, expect, it } from "vitest";
import { DESTINATION_GUIDES, destinationKey, eligibleRecommendationProperty, uniqueDestinations, RECOMMENDATION_GROUPS } from "../smartStayRecommendations";

describe("Smart Stays itinerary recommendations", () => {
  it("matches itinerary city aliases and locality-qualified destinations", () => {
    expect(destinationKey("Vizag")).toBe("visakhapatnam");
    expect(destinationKey("Gachibowli, Hyderabad")).toBe("hyderabad");
    expect(uniqueDestinations([" Hyderabad ", "Secunderabad", "Vizag", "", "Vijayawada"])).toEqual(["Secunderabad", "Vizag", "Vijayawada"]);
  });
  it("provides attractions, popular destinations, local experiences and hidden gems for supported stops", () => {
    for (const guide of Object.values(DESTINATION_GUIDES)) {
      expect(new Set(guide.places.map(p => p.group))).toEqual(new Set(RECOMMENDATION_GROUPS));
    }
    expect(DESTINATION_GUIDES.hyderabad.places.find(p => p.name === "Paigah Tombs")?.group).toBe("Hidden gems");
    expect(DESTINATION_GUIDES.visakhapatnam.places.some(p => p.name === "Charminar")).toBe(false);
    expect(DESTINATION_GUIDES.vijayawada.places.some(p => p.name === "Bhavani Island boat outing")).toBe(true);
  });
  it("excludes unapproved or unpublished properties regardless of proximity", () => {
    expect(eligibleRecommendationProperty({ verified: false, is_live: true, distance_km: 1 }, 25)).toBe(false);
    expect(eligibleRecommendationProperty({ verified: true, is_live: false, distance_km: 1 }, 25)).toBe(false);
    expect(eligibleRecommendationProperty({ verified: true, is_live: true, is_draft: true }, 25)).toBe(false);
    expect(eligibleRecommendationProperty({ verified: true, is_live: true, distance_km: 1 }, 25)).toBe(true);
  });
  it("includes properties within the search radius, not outside it", () => {
    expect(eligibleRecommendationProperty({ verified: true, is_live: true, distance_km: 25 }, 25)).toBe(true);
    expect(eligibleRecommendationProperty({ verified: true, is_live: true, distance_km: 25.1 }, 25)).toBe(false);
    expect(eligibleRecommendationProperty({ verified: true, is_live: true, distance_km: -1 }, 25)).toBe(false);
  });
});