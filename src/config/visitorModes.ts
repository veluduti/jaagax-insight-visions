// Visitor Management configuration per dashboard mode. The page reads only this,
// so a new property type needs a config entry, not a new screen.
import type { DashboardMode } from "@/config/dashboardModes";

export type VisitorConfig = { host: string; hostPlural: string; unit: string; categories: [string, string][]; defaultApproval: boolean; areas: string[] };

const LONG: VisitorConfig = { host: "Resident", hostPlural: "Residents", unit: "Room / Bed", defaultApproval: true,
  categories: [["family", "Family / Relatives"], ["friend", "Friend"], ["delivery", "Delivery / Courier"], ["service", "Service / Maintenance"], ["other", "Others"]],
  areas: ["Main Gate", "Common Area", "Reception"] };
const HOTEL: VisitorConfig = { host: "Guest", hostPlural: "Guests", unit: "Room / Area", defaultApproval: false,
  categories: [["guest_visitor", "Guest Visitor"], ["meeting", "Meeting Attendee"], ["event", "Event Visitor"], ["restaurant", "Restaurant Visitor"], ["delivery", "Delivery"], ["contractor", "Contractor / Vendor"], ["other", "Others"]],
  areas: ["Lobby", "Restaurant", "Banquet Hall", "Business Center"] };
const APT: VisitorConfig = { host: "Host / Tenant", hostPlural: "Tenants", unit: "Unit", defaultApproval: true,
  categories: [["guest_visitor", "Guest"], ["family", "Family"], ["delivery", "Delivery"], ["service", "Service Provider"], ["other", "Others"]],
  areas: ["Main Gate", "Lobby"] };

export const VISITORS: Record<DashboardMode, VisitorConfig> = {
  pg: LONG, hostel: { ...LONG, host: "Student / Resident", hostPlural: "Students" }, coliving: { ...LONG, host: "Member", hostPlural: "Members" },
  hotel: HOTEL, resort: { ...HOTEL, areas: [...HOTEL.areas, "Pool", "Spa"] }, serviced_apartment: APT,
};

export const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", inside: "Inside", checked_out: "Checked-Out", cancelled: "Cancelled" };

/** Minutes a visitor has been (or was) inside. */
export function visitMinutes(v: { checked_in_at: string | null; checked_out_at: string | null }, now = Date.now()): number {
  if (!v.checked_in_at) return 0;
  const end = v.checked_out_at ? new Date(v.checked_out_at).getTime() : now;
  return Math.max(0, Math.round((end - new Date(v.checked_in_at).getTime()) / 60000));
}
export const fmtDuration = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

/** Inside and past expected departure, or past the property's maximum stay. */
export function isOverstay(v: { status: string; checked_in_at: string | null; checked_out_at: string | null; expected_out: string | null }, maxMinutes: number, now = Date.now()): boolean {
  if (v.status !== "inside") return false;
  if (v.expected_out && new Date(v.expected_out).getTime() < now) return true;
  return visitMinutes(v, now) > maxMinutes;
}

/** Whether a time (HH:MM) falls inside the visiting window. */
export function withinHours(at: Date, start: string, end: string): boolean {
  const m = at.getHours() * 60 + at.getMinutes();
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  return m >= sh * 60 + sm && m <= eh * 60 + em;
}
