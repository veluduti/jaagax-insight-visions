import { describe, it, expect } from "vitest";
import { roomCapacity, calendarFreeUnits, savedBasePrice, discoveryNightlyPrice } from "./inventoryRules";

describe("shared hotel inventory rules", () => {
  const room = { id: "r", total_units: null, number_of_available_rooms: 8 };
  const day = "2026-11-16";
  const block = { room_id: "r", start_date: day, end_date: "2026-11-17", units: 2 };
  it("uses legacy counts only when total units is absent", () => {
    expect(roomCapacity(room)).toBe(8);
    expect(roomCapacity({ ...room, total_units: 0 })).toBe(0);
    expect(calendarFreeUnits(room, day, [block], [])).toBe(6);
  });
  it("subtracts maintenance and inactive units without changing bookings", () => {
    const units = [{ id: "u", room_id: "r", status: "maintenance" }, { id: "v", room_id: "r", status: "inactive" }];
    expect(calendarFreeUnits(room, day, [block], units)).toBe(4);
    expect(block.units).toBe(2);
  });
  it("does not double subtract a blocked maintenance unit", () => {
    expect(calendarFreeUnits(room, day, [{ ...block, units: 1, unit_id: "u" }], [{ id: "u", room_id: "r", status: "maintenance" }])).toBe(7);
  });
  it("excludes checkout day and inactive room types", () => {
    expect(calendarFreeUnits(room, "2026-11-17", [block], [])).toBe(8);
    expect(calendarFreeUnits({ ...room, is_active: false }, day, [], [])).toBe(0);
  });
  it("never saves a hidden nightly tariff for long stays", () => {
    expect(savedBasePrice(2500, true)).toBe(0);
    expect(savedBasePrice(2500, false)).toBe(2500);
  });
  it("ignores legacy nightly defaults when displaying long-stay rent", () => {
    expect(discoveryNightlyPrice({ base_price: 2500, monthly_price: 8000 }, true)).toBe(267);
    expect(discoveryNightlyPrice({ base_price: 2500, monthly_price: null, weekly_price: null }, true)).toBe(0);
    expect(discoveryNightlyPrice({ base_price: 2500, monthly_price: 8000 }, false)).toBe(2500);
  });
});