import { describe, expect, it } from "vitest";
import {
  distanceFromCityCentre,
  hasFreeCancellation,
  hasBreakfast,
  amenityLabel,
  formatReviewCount,
  hotelCardLocation,
  hotelSpecialties,
  lowestMatchingRoomOffer,
} from "../hotelDiscoveryMeta";
import { toOccupancyRoom } from "../roomOccupancy";

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
  expect(hasFreeCancellation([{ cancellation_policy: "No free cancellation" }])).toBe(false);
  expect(hasFreeCancellation([{ cancellation_policy: "Flexible cancellation with a fee" }])).toBe(false);
});

it("uses only area/city, not a full street address", () => {
  expect(hotelCardLocation({ locality: "Kondapur", city: "Hyderabad" })).toBe("Kondapur, Hyderabad");
  expect(hotelCardLocation({ locality: "2-57/24/C, Beside Subway", address: "2-57/24/C, Beside Subway", city: "Hyderabad" })).toBe("Hyderabad");
  expect(hotelCardLocation({ locality: "Hyderabad", city: "Hyderabad" })).toBe("Hyderabad");
});

it("highlights saved specialties without inventing best-seller claims", () => {
  expect(hotelSpecialties({ business_types: ["luxury", "corporate"], tags: ["Spa", "demo"] })).toEqual(["Spa", "Luxury Stay", "Corporate / Business Stay"]);
  expect(hotelSpecialties({ business_types: ["hotel"], tags: [] })).toEqual([]);
});

it("advertises the cheapest available matching room instead of unavailable cheaper stock", () => {
  const room = (id: string, price: number, units: number, capacity = 2) => toOccupancyRoom({ id, room_type: id, max_occupancy: capacity, max_children: 0 }, { available: units, perNight: price });
  const pool = [room("sold-out", 1000, 0), room("Standard", 2500, 2), room("Suite", 5000, 2)];
  expect(lowestMatchingRoomOffer(pool, 2, 0, 1)).toEqual({ price: 2500, roomIds: ["Standard"], roomTypes: ["Standard"] });
  expect(lowestMatchingRoomOffer(pool, 4, 0, 2)?.price).toBe(2500);
  expect(lowestMatchingRoomOffer(pool, 8, 0, 2)).toBeNull();
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
