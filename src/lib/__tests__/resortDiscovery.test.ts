import { describe, it, expect } from "vitest";
import { isResortProperty, matchesResortTypes, countResortTypes, resortTypesOf } from "../resortDiscovery";

describe("resort discovery", () => {
  it("treats a property listed as Resort as a resort", () => {
    expect(isResortProperty({ business_types: ["Resort"] })).toBe(true);
  });
  it("treats a property with a resort room as a resort", () => {
    expect(isResortProperty({ business_types: ["hotel"] }, [{ attributes: { business_type: "resort" } }])).toBe(true);
  });
  it("does not treat a plain hotel as a resort", () => {
    expect(isResortProperty({ business_types: ["hotel"] }, [{ attributes: {} }])).toBe(false);
  });
  it("ignores unknown resort categories", () => {
    expect(resortTypesOf({ type_details: { resort_types: ["beach", "moon"] } })).toEqual(["beach"]);
  });
  it("matches any selected category and all when none selected", () => {
    const h = { type_details: { resort_types: ["beach", "family"] } };
    expect(matchesResortTypes(h, [])).toBe(true);
    expect(matchesResortTypes(h, ["hill", "family"])).toBe(true);
    expect(matchesResortTypes(h, ["hill"])).toBe(false);
  });
  it("counts categories per property", () => {
    expect(countResortTypes([{ type_details: { resort_types: ["beach"] } }, { type_details: { resort_types: ["beach", "eco"] } }])).toEqual({ beach: 2, eco: 1 });
  });
});
