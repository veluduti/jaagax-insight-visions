import { describe, it, expect } from "vitest";
import { isUniqueProperty, uniqueTypesOf } from "./uniqueDiscovery";

describe("unique discovery", () => {
  it("only villa, farm stay, homestay or boutique partners qualify", () => {
    expect(isUniqueProperty({ business_types: ["hotel"] })).toBe(false);
    expect(isUniqueProperty({ business_types: ["farm_stay"] })).toBe(true);
  });
  it("derives categories from saved data", () => {
    const h = { business_types: ["villa"], type_details: { private_pool: true, pets: true } };
    expect(uniqueTypesOf(h, [{ accommodation_kind: "tent" }]).sort()).toEqual(["glamping", "pet", "private_pool", "villa"]);
  });
});
