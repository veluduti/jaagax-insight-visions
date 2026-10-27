import { describe, it, expect } from "vitest";
import { apartmentTypesOf, isApartmentProperty, matchesApartmentTypes } from "./apartmentDiscovery";

describe("apartment discovery", () => {
  it("detects serviced apartments from business types", () => {
    expect(isApartmentProperty({ business_types: ["serviced_apartment"] })).toBe(true);
    expect(isApartmentProperty({ business_types: ["hotel"] })).toBe(false);
  });
  it("derives BHK and monthly categories from rooms", () => {
    const t = apartmentTypesOf({}, [{ room_name: "2 BHK Serviced", monthly_price: 40000 }]);
    expect(t).toContain("2bhk");
    expect(t).toContain("monthly");
    expect(t).not.toContain("1bhk");
  });
  it("matches any selected category", () => {
    expect(matchesApartmentTypes({}, [{ room_name: "Studio" }], ["studio", "3bhk"])).toBe(true);
    expect(matchesApartmentTypes({}, [{ room_name: "Studio" }], ["3bhk"])).toBe(false);
  });
});
