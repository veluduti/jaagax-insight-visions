import { describe, it, expect } from "vitest";
import { colivingTypesOf, isColivingProperty, rentalDiscoveryPrice } from "./colivingDiscovery";

describe("partner-backed co-living discovery", () => {
  it("does not turn ordinary hotels into co-living", () => {
    expect(isColivingProperty({ business_types: ["hotel"] })).toBe(false);
    expect(isColivingProperty({}, [{ accommodation_kind: "coliving_shared" }])).toBe(true);
  });
  it("uses saved facilities and gender without inventing eligibility", () => {
    expect(colivingTypesOf({ type_details: { workspace: true, gender: "Female only" } })).toEqual(["women", "workspace"]);
    expect(colivingTypesOf({})).toEqual([]);
  });
  it("shows saved monthly rent, never a nightly fallback", () => {
    expect(rentalDiscoveryPrice([{ monthly_price: 12000 }, { monthly_price: 9500 }], "monthly")).toBe(9500);
    expect(rentalDiscoveryPrice([], "monthly")).toBeNull();
  });
  it("uses weekly pricing only when a partner entered it", () => {
    expect(rentalDiscoveryPrice([{ monthly_price: 12000 }], "weekly")).toBeNull();
    expect(rentalDiscoveryPrice([{ weekly_price: 3000 }], "weekly")).toBe(3000);
  });
});