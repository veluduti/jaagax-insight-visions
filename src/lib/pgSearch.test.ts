import { describe, it, expect } from "vitest";
import { pgMoveOut, pgRentalPlans } from "./pgSearch";
import { format } from "date-fns";

describe("PG rental search", () => {
  it("uses calendar months, clamping month-end like long-stay bookings", () => {
    expect(format(pgMoveOut(new Date(2027, 0, 31), "monthly", 1), "yyyy-MM-dd")).toBe("2027-02-28");
  });
  it("maps weekly duration to seven-day periods", () => {
    expect(format(pgMoveOut(new Date(2026, 9, 27), "weekly", 2), "yyyy-MM-dd")).toBe("2026-11-10");
  });
  it("only offers weekly stays when partner weekly rent exists", () => {
    expect(pgRentalPlans([{ monthly_price: 8000 }])).toEqual(["monthly"]);
    expect(pgRentalPlans([{ weekly_price: 2000 }])).toEqual(["monthly", "weekly"]);
  });
});