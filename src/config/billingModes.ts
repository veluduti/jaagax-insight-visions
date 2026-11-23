// Rent & Payments wording, charge types and billing cycles per dashboard type.
// The page reads only from here, so adding a type means adding one entry.
import type { DashboardMode } from "@/config/dashboardModes";

export type BillingConfig = {
  title: string; people: string; person: string; unit: string; revenueLabel: string;
  source: "long_stay" | "booking" | "both"; cycles: string[]; charges: [string, string][];
};
const LONG: Omit<BillingConfig, "people" | "person"> = {
  title: "Rent & Payments", unit: "Room / Bed", revenueLabel: "Total Rent", source: "long_stay", cycles: ["monthly"],
  charges: [["rent", "Monthly rent"], ["deposit", "Security deposit"], ["mess", "Mess charges"], ["electricity", "Electricity"], ["water", "Water"], ["maintenance", "Maintenance fee"], ["late_fee", "Late fee"], ["other", "Other"]],
};
const HOTEL: Omit<BillingConfig, "title"> = {
  people: "Guests", person: "Guest", unit: "Room", revenueLabel: "Booking Revenue", source: "booking", cycles: ["nightly"],
  charges: [["room", "Room charges"], ["advance", "Advance"], ["restaurant", "Restaurant bill"], ["service", "Service charge"], ["extra_guest", "Extra guest"], ["cancellation", "Cancellation fee"], ["other", "Other"]],
};
export const BILLING: Record<DashboardMode, BillingConfig> = {
  pg: { ...LONG, people: "Residents", person: "Resident" },
  hostel: { ...LONG, people: "Students", person: "Student" },
  coliving: { ...LONG, people: "Members", person: "Member" },
  hotel: { ...HOTEL, title: "Billing & Payments" },
  resort: { ...HOTEL, title: "Billing & Payments", charges: [...HOTEL.charges.slice(0, -1), ["activity", "Activities"], ["spa", "Spa"], ["other", "Other"]] },
  serviced_apartment: {
    title: "Rent & Payments", people: "Guests", person: "Guest", unit: "Unit", revenueLabel: "Rental Revenue", source: "both", cycles: ["nightly", "weekly", "monthly"],
    charges: [["rent", "Rent"], ["deposit", "Security deposit"], ["cleaning", "Cleaning"], ["extra_guest", "Extra guest"], ["service", "Service charge"], ["cancellation", "Cancellation fee"], ["other", "Other"]],
  },
};

export type Line = { label: string; category: string; amount: number };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Subtotal, tax and total for an invoice; discount never pushes total below zero. */
export function invoiceTotals(lines: Line[], discount: number, taxPct: number) {
  const subtotal = r2(lines.reduce((s, l) => s + Math.max(0, Number(l.amount) || 0), 0));
  const d = Math.min(subtotal, Math.max(0, discount || 0));
  const tax = r2(((subtotal - d) * Math.max(0, taxPct || 0)) / 100);
  return { subtotal, discount: d, tax, total: r2(subtotal - d + tax) };
}

export const balanceOf = (i: { total: number; paid_amount: number; refunded_amount: number }) =>
  r2(Math.max(0, Number(i.total) - (Number(i.paid_amount) - Number(i.refunded_amount))));

/** Saved status, plus "overdue" when an unpaid invoice is past its due date. */
export function displayStatus(i: { status: string; due_date: string; total: number; paid_amount: number; refunded_amount: number }, today: string) {
  if ((i.status === "due" || i.status === "partial") && i.due_date < today && balanceOf(i) > 0) return "overdue";
  return i.status;
}

/** Rent for the rest of the month when someone moves in after the 1st. */
export function proratedRent(monthly: number, moveIn: string, monthStart: string) {
  const [y, m] = monthStart.split("-").map(Number); const days = new Date(y, m, 0).getDate();
  if (moveIn <= monthStart) return r2(monthly);
  if (moveIn.slice(0, 7) !== monthStart.slice(0, 7)) return 0;
  const day = Number(moveIn.slice(8, 10));
  return r2((monthly * (days - day + 1)) / days);
}
