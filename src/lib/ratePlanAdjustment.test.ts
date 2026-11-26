import { describe, expect, it } from "vitest";
import { isRatePlanAdjustmentType, RATE_PLAN_ADJUSTMENT_TYPES } from "./ratePlanAdjustment";

describe("rate-plan adjustment values", () => {
  it("sends flat for fixed rupee adjustments, matching the database constraint", () => {
    expect(RATE_PLAN_ADJUSTMENT_TYPES.find((option) => option.label === "Fixed ₹")?.value).toBe("flat");
    expect(isRatePlanAdjustmentType("flat")).toBe(true);
    expect(isRatePlanAdjustmentType("fixed")).toBe(false);
  });

  it("allows percent and rejects missing or unsupported values", () => {
    expect(isRatePlanAdjustmentType("percent")).toBe(true);
    expect(isRatePlanAdjustmentType(undefined)).toBe(false);
    expect(isRatePlanAdjustmentType("currency")).toBe(false);
  });
});