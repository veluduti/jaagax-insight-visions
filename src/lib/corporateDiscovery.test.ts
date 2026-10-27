import { describe, it, expect } from "vitest";
import { isCorporateProperty, corporateTypesOf } from "./corporateDiscovery";

describe("corporate discovery", () => {
  it("only partner-marked properties are corporate", () => {
    expect(isCorporateProperty({ business_types: ["hotel"] })).toBe(false);
    expect(isCorporateProperty({ business_types: ["corporate"] })).toBe(true);
    expect(isCorporateProperty({ type_details: { gst_invoice: true } })).toBe(true);
    expect(isCorporateProperty({}, [{ accommodation_kind: "executive_room" }])).toBe(true);
  });
  it("derives categories from saved fields", () => {
    const h = { business_types: ["corporate", "hotel"], type_details: { gst_invoice: true, meeting_rooms: 2 } };
    expect(corporateTypesOf(h, [{ monthly_price: 30000 }]).sort()).toEqual(["business_hotel", "extended", "gst", "meeting"]);
  });
});
