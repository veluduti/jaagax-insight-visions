import { describe, it, expect } from "vitest";
import { isOverstay, visitMinutes, withinHours, VISITORS } from "./visitorModes";

const now = new Date("2026-11-20T12:00:00Z").getTime();
describe("visitor rules", () => {
  it("flags visitors inside past expected departure", () => {
    expect(isOverstay({ status: "inside", checked_in_at: "2026-11-20T11:00:00Z", checked_out_at: null, expected_out: "2026-11-20T11:30:00Z" }, 240, now)).toBe(true);
  });
  it("flags visitors inside longer than the maximum", () => {
    expect(isOverstay({ status: "inside", checked_in_at: "2026-11-20T07:00:00Z", checked_out_at: null, expected_out: null }, 240, now)).toBe(true);
  });
  it("does not flag checked-out visitors", () => {
    expect(isOverstay({ status: "checked_out", checked_in_at: "2026-11-20T01:00:00Z", checked_out_at: "2026-11-20T11:00:00Z", expected_out: null }, 60, now)).toBe(false);
  });
  it("measures duration to check-out", () => {
    expect(visitMinutes({ checked_in_at: "2026-11-20T10:00:00Z", checked_out_at: "2026-11-20T10:50:00Z" }, now)).toBe(50);
  });
  it("respects visiting hours", () => {
    expect(withinHours(new Date(2026, 10, 20, 22, 0), "08:00", "21:00")).toBe(false);
    expect(withinHours(new Date(2026, 10, 20, 9, 0), "08:00", "21:00")).toBe(true);
  });
  it("PG requires approval by default, hotels do not", () => {
    expect(VISITORS.pg.defaultApproval).toBe(true);
    expect(VISITORS.hotel.defaultApproval).toBe(false);
  });
});
