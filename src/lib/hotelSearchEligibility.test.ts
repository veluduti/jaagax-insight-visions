import { describe, expect, it } from "vitest";
import { exactHotelMatches, hasRequestedRooms } from "./hotelSearchEligibility";
const room = { id: "r1", room_type: "Double", maxAdults: 2, maxChildren: 1, maxTotal: 3, available: 1, perNight: 2000 };
describe("strict hotel search", () => {
  it("does not show a hotel with one available room when two rooms are requested", () => {
    expect(hasRequestedRooms([room], 2, 0, 2)).toBe(false);
    expect(hasRequestedRooms([{ ...room, available: 2 }], 2, 0, 2)).toBe(true);
  });
  it("does not add extra rooms to make a one-room search fit", () => {
    expect(hasRequestedRooms([{ ...room, available: 3 }], 4, 0, 1)).toBe(false);
    expect(hasRequestedRooms([{ ...room, available: 3 }], 4, 0, 2)).toBe(true);
  });
  it("never displays sold-out inventory", () => {
    expect(hasRequestedRooms([{ ...room, available: 0 }], 2, 0, 1)).toBe(false);
  });
  it("returns no hotels rather than weakening selected filters", () => {
    expect(exactHotelMatches([{ id: "partial", miss: 1 }])).toEqual([]);
    expect(exactHotelMatches([{ id: "exact", miss: 0 }, { id: "partial", miss: 2 }])).toEqual([{ id: "exact", miss: 0 }]);
  });
});