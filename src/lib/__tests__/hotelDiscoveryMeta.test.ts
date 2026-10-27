import { describe, expect, it } from "vitest";
import {
  distanceFromCityCentre,
  hasFreeCancellation,
  hasBreakfast,
  amenityLabel,
  formatReviewCount,
} from "../hotelDiscoveryMeta";

// Hotel discovery rows may only show facts the partner or a guest entered.

describe("Hotel discovery row meta", () => {
it("shows no city-centre distance without a saved map pin", () => {
  expect(distanceFromCityCentre({ city: "Hyderabad", latitude: null, longitude: null })).toBeNull();
});

it("shows no city-centre distance for a city with no curated centre", () => {
  expect(distanceFromCityCentre({ city: "Nowhereville", latitude: 17.47, longitude: 78.35 })).toBeNull();
});

it("computes distance from the hotel's own pin to the city centre", () => {
  const km = distanceFromCityCentre({ city: "Hyderabad", latitude: 17.385, longitude: 78.4867 });
  expect(km).toBe(0);
  const kondapur = distanceFromCityCentre({ city: "Hyderabad", latitude: 17.4700319, longitude: 78.3534174 });
  expect(kondapur).toBeGreaterThan(10);
  expect(kondapur).toBeLessThan(20);
});

it("reports free cancellation only when the partner policy says so", () => {
  expect(hasFreeCancellation([{ cancellation_policy: "Free cancellation up to 24h before" }])).toBe(true);
  expect(hasFreeCancellation([{ cancellation_policy: "Non-refundable" }])).toBe(false);
  expect(hasFreeCancellation([{ cancellation_policy: null }])).toBe(false);
  expect(hasFreeCancellation([])).toBe(false);
});

it("reports breakfast only when entered room or hotel data mentions it", () => {
  expect(hasBreakfast([{ amenities: ["Breakfast included"], attributes: {} }], [])).toBe(true);
  expect(hasBreakfast([], ["Breakfast"])).toBe(true);
  expect(hasBreakfast([{ amenities: ["Air conditioning"], attributes: {} }], ["Parking"])).toBe(false);
});

it("keeps amenity chip labels short but truthful", () => {
  expect(amenityLabel("Free Wi-Fi")).toBe("WiFi");
  expect(amenityLabel("24-hour front desk")).toBe("24h Desk");
  expect(amenityLabel("Power backup")).toBe("Power backup");
});

it("formats review counts without inflating them", () => {
  expect(formatReviewCount(87)).toBe("87");
  expect(formatReviewCount(1234)).toBe("1.2K");
});
});
