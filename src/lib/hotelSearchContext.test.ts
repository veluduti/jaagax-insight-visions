import { describe, expect, it } from "vitest";
import { currentHotelSearchDates, hotelSearchParams, readHotelSearchContext } from "./hotelSearchContext";

describe("hotel search continuity", () => {
  it("moves yesterday's search to today instead of requesting past supplier inventory", () => {
    expect(currentHotelSearchDates(new URLSearchParams("checkin=2026-11-12&checkout=2026-11-13"), "2026-11-13")).toEqual({ checkIn: "2026-11-13", checkOut: "2026-11-14", expired: true });
  });
  it("preserves stay length when an old link expires", () => {
    expect(currentHotelSearchDates(new URLSearchParams("checkin=2026-11-10&checkout=2026-11-13"), "2026-11-13").checkOut).toBe("2026-11-16");
  });
  it("never shifts valid upcoming dates", () => {
    expect(currentHotelSearchDates(new URLSearchParams("checkin=2026-11-20&checkout=2026-11-21"), "2026-11-13")).toEqual({ checkIn: "2026-11-20", checkOut: "2026-11-21", expired: false });
  });
  it("preserves dates, rooms, adults and child ages when opening a hotel", () => {
    const search = { checkIn: "2027-06-15", checkOut: "2027-06-18", adults: 4, rooms: 2, childAges: [3, 10] };
    expect(readHotelSearchContext(hotelSearchParams(search), "2026-11-10")).toEqual({ ...search, children: 2, nationality: "IN", currency: "INR" });
  });
  it("keeps homepage guest counts", () => {
    expect(readHotelSearchContext(new URLSearchParams("guests=5"), "2026-11-10").adults).toBe(5);
  });
  it("preserves actual nationality and display currency", () => {
    const result = readHotelSearchContext(hotelSearchParams({ checkIn: "2027-06-15", checkOut: "2027-06-18", adults: 2, rooms: 1, childAges: [], nationality: "BR", currency: "USD" }), "2026-11-10");
    expect(result.nationality).toBe("BR"); expect(result.currency).toBe("USD");
  });
  it("repairs an invalid checkout without losing the selected arrival", () => {
    const result = readHotelSearchContext(new URLSearchParams("checkin=2027-06-15&checkout=2027-06-14"), "2026-11-10");
    expect(result.checkIn).toBe("2027-06-15");
    expect(result.checkOut).toBe("2027-06-16");
  });
});