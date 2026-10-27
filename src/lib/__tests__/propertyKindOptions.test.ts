import { describe, expect, it } from "vitest";
import { buildPropertyKindOptions, FALLBACK_PROPERTY_KINDS } from "@/components/home/propertyKindOptions";

describe("buildPropertyKindOptions", () => {
  it("lists the distinct backend types with All Types first", () => {
    const options = buildPropertyKindOptions([
      { type: "Villa" },
      { type: "Apartment" },
      { type: "Apartment" },
      { type: "Office Space" },
      { type: "Independent House" },
    ]);

    expect(options[0]).toEqual({ value: "any", label: "All Types" });
    expect(options.slice(1).map((o) => o.value)).toEqual([
      "Apartment",
      "Independent House",
      "Office Space",
      "Villa",
    ]);
  });

  it("keeps values exactly as stored so search filtering matches", () => {
    const options = buildPropertyKindOptions([{ type: "Independent House" }]);
    expect(options[1].value).toBe("Independent House");
  });

  it("ignores empty and missing types", () => {
    const options = buildPropertyKindOptions([{ type: null }, { type: "  " }, {}]);
    expect(options).toEqual([
      { value: "any", label: "All Types" },
      { value: "Apartment", label: "Apartment" },
      { value: "Villa", label: "Villa" },
    ]);
  });

  it("falls back to the static list when the backend has no types", () => {
    expect(buildPropertyKindOptions([])).toEqual(FALLBACK_PROPERTY_KINDS);
  });
});
