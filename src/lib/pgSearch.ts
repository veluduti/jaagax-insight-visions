import { addMonths, addWeeks } from "date-fns";
import type { RentPlan } from "./longStayPricing";

export function pgMoveOut(moveIn: Date, plan: RentPlan, duration: number): Date {
  const count = Math.min(60, Math.max(1, Math.floor(duration) || 1));
  return plan === "weekly" ? addWeeks(moveIn, count) : addMonths(moveIn, count);
}

export function pgRentalPlans(rooms: { weekly_price?: number | null; monthly_price?: number | null }[]): RentPlan[] {
  // Monthly equivalents are supported by the existing long-stay quote API.
  return rooms.some(r => Number(r.weekly_price) > 0) ? ["monthly", "weekly"] : ["monthly"];
}