import { describe, it, expect } from "vitest";
import { yearlySavingsPercent, gstBreakup, commissionAmount } from "./partnerPlans";
describe("partner plans", () => {
  it("Starter yearly ₹29,990 vs ₹2,999/month saves 17%", () => expect(yearlySavingsPercent(2999, 29990)).toBe(17));
  it("Growth yearly ₹79,990 vs ₹7,999/month saves 17%", () => expect(yearlySavingsPercent(7999, 79990)).toBe(17));
  it("adds 18% GST to ₹2,999", () => expect(gstBreakup(2999).total).toBe(3538.82));
  it("12% commission on ₹10,000 booking is ₹1,200", () => expect(commissionAmount(10000, 12)).toBe(1200));
});
