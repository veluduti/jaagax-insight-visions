import { describe, it, expect } from "vitest";
import { isLuxuryProperty, luxuryTypesOf, countLuxuryTypes } from "./luxuryDiscovery";

describe("luxury discovery", () => {
  it("only partner-marked properties are luxury", () => {
    expect(isLuxuryProperty({ business_types: ["hotel"] })).toBe(false);
    expect(isLuxuryProperty({ business_types: ["luxury"] })).toBe(true);
    expect(isLuxuryProperty({ type_details: { luxury_tier: "Premium" } })).toBe(true);
    expect(isLuxuryProperty({}, [{ accommodation_kind: "luxury_suite" }])).toBe(true);
  });
  it("derives categories from saved data", () => {
    const h = { business_types: ["luxury", "villa"], type_details: { resort_types: ["beach"] } };
    const rooms = [{ accommodation_kind: "luxury_suite", attributes: { private_pool: true } }];
    expect(luxuryTypesOf(h, rooms).sort()).toEqual(["beachfront", "private_pool", "suite", "villa"]);
    expect(countLuxuryTypes([h], () => rooms).villa).toBe(1);
  });
});
