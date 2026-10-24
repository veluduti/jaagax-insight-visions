import { describe, expect, it } from "vitest";
import { NUMBER_QUICK_REPLIES } from "../../propertyFieldsConfig";

// Listing chat shows suggestions only while the user types; numeric price/area
// questions must never render a preset chip row.
describe("Listing chat preset chips", () => {
  it("shows no preset chips for price and area questions", () => {
    for (const fieldId of ["price_per_unit", "total_price", "flat_size", "built_area", "built_up_area", "land_size"]) {
      expect(NUMBER_QUICK_REPLIES, fieldId).not.toHaveProperty(fieldId);
    }
  });

  it("still shows preset chips for questions that have them configured", () => {
    expect(NUMBER_QUICK_REPLIES.floor_number).toContain("Ground floor");
  });
});
