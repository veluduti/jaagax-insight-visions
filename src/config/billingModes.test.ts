import { describe, it, expect } from "vitest";
import { invoiceTotals, balanceOf, displayStatus, proratedRent, BILLING } from "./billingModes";

describe("rent & payments rules", () => {
  it("applies discount before tax", () => {
    expect(invoiceTotals([{ label: "Rent", category: "rent", amount: 10000 }], 1000, 18)).toEqual({ subtotal: 10000, discount: 1000, tax: 1620, total: 10620 });
  });
  it("discount cannot exceed subtotal", () => {
    expect(invoiceTotals([{ label: "x", category: "other", amount: 500 }], 900, 0).total).toBe(0);
  });
  it("balance counts refunds back as unpaid", () => {
    expect(balanceOf({ total: 8000, paid_amount: 8000, refunded_amount: 2000 })).toBe(2000);
  });
  it("unpaid past due date is overdue", () => {
    expect(displayStatus({ status: "partial", due_date: "2026-11-05", total: 8000, paid_amount: 3000, refunded_amount: 0 }, "2026-11-23")).toBe("overdue");
    expect(displayStatus({ status: "paid", due_date: "2026-11-05", total: 8000, paid_amount: 8000, refunded_amount: 0 }, "2026-11-23")).toBe("paid");
  });
  it("prorates mid-month move-in", () => {
    expect(proratedRent(9000, "2026-11-16", "2026-11-01")).toBe(4500);
    expect(proratedRent(9000, "2026-10-02", "2026-11-01")).toBe(9000);
  });
  it("PG uses resident rent wording, hotel uses bookings", () => {
    expect(BILLING.pg.person).toBe("Resident"); expect(BILLING.hotel.source).toBe("booking");
  });
});
