/**
 * Long-stay (PG / Hostel / Co-living) rent maths. Display-side only — the
 * amount actually charged must be recomputed on the server before payment.
 * Weekly → monthly equivalent uses weekly × 52 ÷ 12 (never "4 weeks = 1 month").
 */
export type AdvanceMode = "none" | "fixed" | "one_month" | "two_month";
export type RentPlan = "weekly" | "monthly";

const r2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const pos = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

export const weeklyToMonthly = (weekly: number) => r2((pos(weekly) * 52) / 12);

export const ADVANCE_LABEL: Record<AdvanceMode, string> = {
  none: "No advance", fixed: "Fixed amount", one_month: "One month's rent", two_month: "Two months' rent",
};

export function normalizeAdvanceMode(v: unknown): AdvanceMode {
  const s = String(v || "").toLowerCase();
  if (s.startsWith("fixed")) return "fixed";
  if (s.startsWith("one") || s === "1") return "one_month";
  if (s.startsWith("two") || s === "2") return "two_month";
  return "none";
}

export interface LongStayInput {
  weekly_price?: number | null; monthly_price?: number | null; attributes?: Record<string, any> | null;
  plan?: RentPlan; duration?: number; // weeks or months
}

export function longStayQuote({ weekly_price, monthly_price, attributes, plan, duration }: LongStayInput) {
  const a = attributes || {};
  const weekly = pos(weekly_price);
  const monthlyDirect = pos(monthly_price);
  const monthly = monthlyDirect || (weekly ? weeklyToMonthly(weekly) : 0);
  const usePlan: RentPlan = plan ?? (monthly ? "monthly" : "weekly");
  const minMonths = pos(a.min_months);
  const len = Math.max(1, Math.floor(pos(duration) || (usePlan === "monthly" ? minMonths || 1 : 1)));
  const periodRent = usePlan === "monthly" ? monthly : weekly;

  const mode = normalizeAdvanceMode(a.advance_mode);
  const advance = r2(mode === "fixed" ? pos(a.advance_amount) : mode === "one_month" ? monthly : mode === "two_month" ? monthly * 2 : 0);
  const deposit = r2(pos(a.security_deposit));
  const utilities = r2(pos(a.utility_charges) + pos(a.food_charges) + pos(a.service_charges));
  const perPeriodExtras = usePlan === "monthly" ? utilities : r2((utilities * 12) / 52);
  const oneTimeFees = r2(pos(a.other_fees));
  const taxPct = Math.min(pos(a.tax_percent), 28);
  const firstPeriod = r2(periodRent + perPeriodExtras);
  const tax = r2(((firstPeriod + oneTimeFees) * taxPct) / 100);
  // Due at booking: first period rent + charges + one-time fees + tax + advance + refundable deposit.
  // Advance is rent paid ahead (adjusted later); deposit is refundable — kept separate.
  const dueAtBooking = r2(firstPeriod + oneTimeFees + tax + advance + deposit);
  const recurring = r2(firstPeriod * (1 + taxPct / 100));
  const remainingPeriods = Math.max(0, len - 1);

  return {
    plan: usePlan, duration: len, weekly, monthly, monthlyIsDerived: !monthlyDirect && !!weekly,
    periodRent, perPeriodExtras, oneTimeFees, taxPct, tax, advanceMode: mode, advance, deposit,
    depositRefundable: a.deposit_refundable !== false, dueAtBooking, recurring, remainingPeriods,
    futureRent: r2(recurring * remainingPeriods), minMonths, noticeDays: pos(a.notice_days),
  };
}
