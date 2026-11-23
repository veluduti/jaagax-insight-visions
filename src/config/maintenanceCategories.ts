// Maintenance categories, priorities and SLA rules per dashboard mode.
// Add a category or mode here and the Maintenance page adapts automatically.
import type { DashboardMode } from "@/config/dashboardModes";

export type MaintCategory = { key: string; label: string; modes: DashboardMode[] | "all" };
export const MAINT_CATEGORIES: MaintCategory[] = [
  { key: "electrical", label: "Electrical", modes: "all" },
  { key: "plumbing", label: "Plumbing", modes: "all" },
  { key: "hvac", label: "AC / Fan / HVAC", modes: "all" },
  { key: "furniture", label: "Furniture & Fixtures", modes: "all" },
  { key: "internet", label: "Internet / Wi-Fi", modes: "all" },
  { key: "lift", label: "Lift / Elevator", modes: ["hotel", "resort", "serviced_apartment", "hostel", "coliving", "pg"] },
  { key: "kitchen_equipment", label: "Kitchen Equipment", modes: ["hotel", "resort"] },
  { key: "housekeeping_equipment", label: "Housekeeping Equipment", modes: ["hotel", "resort", "serviced_apartment"] },
  { key: "water_purifier", label: "Water Purifier", modes: ["pg", "hostel", "coliving"] },
  { key: "shared_bathroom", label: "Shared Bathrooms", modes: ["pg", "hostel", "coliving"] },
  { key: "common_area", label: "Common Area", modes: ["pg", "hostel", "coliving"] },
  { key: "pool", label: "Pool", modes: ["resort"] },
  { key: "landscaping", label: "Landscaping & Outdoor", modes: ["resort"] },
  { key: "recreation", label: "Recreational Facilities", modes: ["resort"] },
  { key: "appliances", label: "Appliances", modes: ["serviced_apartment"] },
  { key: "fire_safety", label: "Fire Safety", modes: "all" },
  { key: "other", label: "Other", modes: "all" },
];
export const categoriesForModes = (modes: DashboardMode[]) => MAINT_CATEGORIES.filter(c => c.modes === "all" || c.modes.some(m => modes.includes(m)));
export const maintCategoryLabel = (k: string | null) => MAINT_CATEGORIES.find(c => c.key === k)?.label ?? (k || "Other");

/** Hours to resolve, per priority. */
export const SLA_HOURS: Record<string, number> = { urgent: 2, high: 4, normal: 24, low: 72 };
export const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const requesterLabel = (m: DashboardMode) => (m === "pg" || m === "hostel" ? "Resident" : m === "coliving" ? "Member" : "Guest");

export const dueFrom = (raisedAt: Date, priority: string) => new Date(raisedAt.getTime() + (SLA_HOURS[priority] ?? 24) * 3600e3);

export type TicketLike = { status: string; due_at: string | null; completed_at: string | null };
export function ticketState(t: TicketLike, now = Date.now()): "completed" | "overdue" | "in_progress" | "scheduled" | "open" {
  if (t.status === "done") return "completed";
  if (t.due_at && new Date(t.due_at).getTime() < now) return "overdue";
  if (t.status === "in_progress") return "in_progress";
  if (t.status === "scheduled") return "scheduled";
  return "open";
}
/** Completed tickets finished by their due time, as a percentage. */
export function slaOnTime(tickets: TicketLike[]): number | null {
  const done = tickets.filter(t => t.status === "done" && t.due_at && t.completed_at);
  if (!done.length) return null;
  return Math.round((done.filter(t => new Date(t.completed_at!) <= new Date(t.due_at!)).length / done.length) * 100);
}
