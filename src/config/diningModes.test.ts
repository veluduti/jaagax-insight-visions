import { describe, it, expect } from "vitest";
import { proratedAmount, isServing, DINING } from "./diningModes";

describe("mess billing", () => {
  it("charges the full month when the plan started earlier", () => expect(proratedAmount(5000, "2026-10-03", "2026-11-01")).toBe(5000));
  it("charges only the remaining days when joining mid-month", () => expect(proratedAmount(3000, "2026-11-16", "2026-11-01")).toBe(1500));
  it("charges nothing for a plan starting next month", () => expect(proratedAmount(3000, "2026-12-02", "2026-11-01")).toBe(0));
  it("does not serve paused subscriptions until the pause ends", () => {
    expect(isServing({ status: "paused", paused_until: "2026-11-25" }, "2026-11-23")).toBe(false);
    expect(isServing({ status: "paused", paused_until: "2026-11-20" }, "2026-11-23")).toBe(true);
    expect(isServing({ status: "cancelled", paused_until: null }, "2026-11-23")).toBe(false);
  });
  it("hides resident attendance for service apartments", () => expect(DINING.serviced_apartment.modules).not.toContain("attendance"));
});
