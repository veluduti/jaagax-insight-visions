// Mess & Dining configuration per dashboard mode. Add a mode or module here and the page adapts.
import type { DashboardMode } from "@/config/dashboardModes";

export type DiningModule = "subscriptions" | "attendance" | "menus" | "plans" | "requests" | "inventory" | "reports";
export type DiningConfig = { title: string; people: string; revenueLabel: string; requestKinds: [string, string][]; modules: DiningModule[] };

const ALL: DiningModule[] = ["menus", "plans", "subscriptions", "attendance", "requests", "inventory", "reports"];
const LONG: DiningConfig = { title: "Mess & Dining", people: "Residents", revenueLabel: "Mess Revenue", modules: ALL,
  requestKinds: [["extra_meal", "Extra meal"], ["guest_meal", "Guest meal"], ["skip_meal", "Skip meal"], ["special_diet", "Special diet"], ["tiffin", "Packed / tiffin"]] };
const HOTEL: DiningConfig = { title: "Dining & Restaurant", people: "Guests", revenueLabel: "Dining Revenue", modules: ALL,
  requestKinds: [["room_service", "In-room dining"], ["breakfast", "Breakfast package"], ["buffet", "Buffet"], ["table_booking", "Restaurant table"], ["private_dining", "Private dining"]] };
const APT: DiningConfig = { title: "Meals & Dining", people: "Guests", revenueLabel: "Meal Revenue", modules: ["menus", "plans", "requests", "inventory", "reports"],
  requestKinds: [["breakfast", "Breakfast service"], ["meal_package", "Meal package"], ["catering", "Catering request"], ["private_dining", "Private dining"]] };

export const DINING: Record<DashboardMode, DiningConfig> = {
  pg: LONG, hostel: { ...LONG, people: "Students / Residents" }, coliving: { ...LONG, people: "Members" },
  hotel: HOTEL, resort: { ...HOTEL, requestKinds: [...HOTEL.requestKinds, ["poolside", "Poolside dining"]] }, serviced_apartment: APT,
};
export const MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["snacks", "Snacks"], ["dinner", "Dinner"]] as const;
export const mealLabel = (k: string) => MEALS.find(m => m[0] === k)?.[1] ?? k;

/** Price for part of a month: daily share of the monthly price for the days actually covered. */
export function proratedAmount(monthlyPrice: number, start: string, monthStart: string): number {
  const ms = new Date(monthStart + "T00:00:00Z"); const s = new Date(start + "T00:00:00Z");
  const days = new Date(Date.UTC(ms.getUTCFullYear(), ms.getUTCMonth() + 1, 0)).getUTCDate();
  if (s <= ms) return Math.round(monthlyPrice);
  if (s.getUTCMonth() !== ms.getUTCMonth() || s.getUTCFullYear() !== ms.getUTCFullYear()) return 0;
  const used = days - s.getUTCDate() + 1;
  return Math.round((monthlyPrice * used) / days);
}

/** A paused subscription is not served until its pause ends. */
export const isServing = (s: { status: string; paused_until: string | null }, day: string) =>
  s.status === "active" || (s.status === "paused" && !!s.paused_until && s.paused_until < day);
