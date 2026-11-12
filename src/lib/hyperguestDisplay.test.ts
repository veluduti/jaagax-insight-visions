import { describe, expect, it } from "vitest";
import { hotelCoordinates, roomOccupancy, hotelPolicies, englishDescription } from "./hyperguestDisplay";

describe("hyperguest display helpers", () => {
  it("returns saved coordinates and hides missing/zero ones", () => {
    expect(hotelCoordinates({ coordinates: { latitude: -22.9107, longitude: -43.1711 } })).toEqual({ lat: -22.9107, lng: -43.1711 });
    expect(hotelCoordinates({ coordinates: { latitude: 0, longitude: 0 } })).toBeNull();
    expect(hotelCoordinates({})).toBeNull();
  });
  it("lists only occupancy limits the supplier provided", () => {
    expect(roomOccupancy({ maxOccupancy: 3, adultsNumber: 2, childrenNumber: 0 })).toEqual([{ label: "Max guests", value: 3 }, { label: "Adults", value: 2 }]);
  });
  it("skips cancellation and empty hotel policies", () => {
    expect(hotelPolicies({ policies: [{ type: "cancellation", name: "C", description: "x" }, { name: "Pets", description: "No pets" }, { name: "Empty" }] })).toEqual([{ title: "Pets", body: "No pets" }]);
  });
  it("prefers the English general description", () => {
    expect(englishDescription([{ language: "fr_FR", type: "general", description: "Bonjour" }, { language: "en_US", type: "general", description: "Hello " }])).toBe("Hello");
  });
});
