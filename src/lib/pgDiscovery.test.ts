import { describe, it, expect } from "vitest";
import { isPgProperty, pgTypesOf, matchesPgTypes } from "./pgDiscovery";

describe("pg discovery", () => {
  it("detects PGs and hostels from business types", () => {
    expect(isPgProperty({ business_types: ["pg"] })).toBe(true);
    expect(isPgProperty({ business_types: ["hostel"] })).toBe(true);
    expect(isPgProperty({ business_types: ["hotel"] })).toBe(false);
  });
  it("reads boys/girls from partner-saved gender", () => {
    expect(pgTypesOf({ type_details: { gender: "Girls" } })).toEqual(["girls"]);
    expect(pgTypesOf({ type_details: { gender: "Boys" } })).toEqual(["boys"]);
  });
  it("filters by selected category", () => {
    expect(matchesPgTypes({ type_details: { gender: "Boys" } }, [], ["girls"])).toBe(false);
  });
});
