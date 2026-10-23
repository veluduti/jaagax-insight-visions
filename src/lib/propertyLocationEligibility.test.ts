import { describe, expect, it } from "vitest";
import { hasRequiredLocationHierarchy } from "./propertyLocationEligibility";

describe("Google city selection", () => {
  const region = { country_id: "country", state_id: "state", district_id: "district" };
  it("accepts a Google-selected city outside the short master list", () => {
    expect(hasRequiredLocationHierarchy({ ...region, city: "Moosapet", place_id: "google-place", city_id: null })).toBe(true);
  });
  it("keeps district routing required for Google-selected cities", () => {
    expect(hasRequiredLocationHierarchy({ ...region, district_id: null, city: "Moosapet", place_id: "google-place" })).toBe(false);
  });
  it("does not accept unverified typed city text", () => {
    expect(hasRequiredLocationHierarchy({ ...region, city: "Moosapet" })).toBe(false);
  });
});