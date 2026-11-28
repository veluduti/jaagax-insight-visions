import { describe, expect, it } from "vitest";
import { isPastPgVisitDate } from "./pgVisitCalendar";

describe("PG visit calendar selection", () => {
  const today = new Date(2026, 10, 28, 19, 50);
  it("allows selecting today even before the current time", () => {
    expect(isPastPgVisitDate(new Date(2026, 10, 28), today)).toBe(false);
  });
  it("allows browsing a future date without published slots", () => {
    expect(isPastPgVisitDate(new Date(2026, 11, 2), today)).toBe(false);
  });
  it("keeps past dates unavailable", () => {
    expect(isPastPgVisitDate(new Date(2026, 10, 27), today)).toBe(true);
  });
});