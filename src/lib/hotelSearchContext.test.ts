import { describe, expect, it } from "vitest";
import { hotelSearchParams, readHotelSearchContext } from "./hotelSearchContext";

describe("hotel search continuity", () => {
  it("preserves dates, rooms, adults and child ages when opening a hotel", () => {
    const search = { checkIn: "2027-06-15", checkOut: "2027-06-18", adults: 4, rooms: 2, childAges: [3, 10] };
    expect(readHotelSearchContext(hotelSearchParams(search), "2026-11-10")).toEqual({ ...search, children: 2 });
  });
  it("keeps homepage guest counts", () => {
    expect(readHotelSearchContext(new URLSearchParams("guests=5"), "2026-11-10").adults).toBe(5);
  });
  it("repairs an invalid checkout without losing the selected arrival", () => {
    const result = readHotelSearchContext(new URLSearchParams("checkin=2027-06-15&checkout=2027-06-14"), "2026-11-10");
    expect(result.checkIn).toBe("2027-06-15");
    expect(result.checkOut).toBe("2027-06-16");
  });
});