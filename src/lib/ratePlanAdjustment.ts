export const RATE_PLAN_ADJUSTMENT_TYPES = [
  { value: "percent", label: "Percent" },
  { value: "flat", label: "Fixed ₹" },
] as const;

export function isRatePlanAdjustmentType(value: unknown): value is "percent" | "flat" {
  return RATE_PLAN_ADJUSTMENT_TYPES.some((option) => option.value === value);
}