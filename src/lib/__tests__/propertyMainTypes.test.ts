import { describe, expect, it } from "vitest";
import { getMainTypeSubtypes, PROPERTY_MAIN_TYPES } from "@/config/propertyMainTypes";
describe("property main types", () => {
  it("shows only the five main categories", () => {
    expect(PROPERTY_MAIN_TYPES.map((t) => t.label)).toEqual(["Residential", "Commercial", "Plots / Land", "Agricultural", "Co-working"]);
  });
  it("Residential search covers Apartment and Villa", () => {
    const s = getMainTypeSubtypes("residential")!;
    expect(s).toContain("Apartment");
    expect(s).toContain("Villa");
    expect(s).not.toContain("Office Space");
  });
});
