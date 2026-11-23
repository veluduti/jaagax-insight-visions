// Residents, Guests & Leads: terminology, tabs, lead stages and KPIs per dashboard mode.
// Read by the one shared module so every property type uses the same screens.
import { isLongStayMode, type DashboardMode } from "@/config/dashboardModes";

export type PeopleSource = "stays" | "bookings";
export type LeadStage = { key: string; label: string; tone: string };
export type ResidentConfig = {
  title: string; person: string; people: string; addLabel: string; unitLabel: string; amountLabel: string;
  sources: PeopleSource[]; tabs: [string, string][]; stages: LeadStage[];
};

const LONG_STAGES: LeadStage[] = [
  { key: "new", label: "New Leads", tone: "blue" }, { key: "contacted", label: "Contacted", tone: "violet" },
  { key: "visit", label: "Visit Scheduled", tone: "amber" }, { key: "application", label: "Application", tone: "fuchsia" },
  { key: "converted", label: "Converted", tone: "green" },
];
const SHORT_STAGES: LeadStage[] = [
  { key: "new", label: "Enquiry", tone: "blue" }, { key: "contacted", label: "Follow-up", tone: "violet" },
  { key: "quoted", label: "Quotation Sent", tone: "amber" }, { key: "reservation", label: "Reservation Pending", tone: "fuchsia" },
  { key: "converted", label: "Booking Confirmed", tone: "green" },
];
export const LEAD_SOURCES: [string, string][] = [["website", "Website"], ["walk_in", "Walk-in"], ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["qr", "QR code"], ["referral", "Referral"], ["ota", "OTA / Portal"], ["other", "Other"]];

const longStay = (person: string, people: string): ResidentConfig => ({
  title: `${people} & Leads`, person, people, addLabel: `Add ${person}`, unitLabel: "Room / Bed", amountLabel: "Rent (Monthly)",
  sources: ["stays"], stages: LONG_STAGES,
  tabs: [["residents", people], ["leads", "Leads & Enquiries"], ["applications", "Applications"], ["moves", "Move-in / Move-out"], ["waitlist", "Waitlist"], ["alumni", "Inactive / Alumni"]],
});

export function residentConfig(mode: DashboardMode, modes: DashboardMode[] = [mode]): ResidentConfig {
  if (mode === "pg") return longStay("Resident", "Residents");
  if (mode === "hostel") return longStay("Student", "Students & Residents");
  if (mode === "coliving") return longStay("Member", "Members");
  const hybrid = modes.some(isLongStayMode) || mode === "serviced_apartment";
  return {
    title: mode === "serviced_apartment" ? "Guests, Tenants & Leads" : "Guests & Enquiries",
    person: "Guest", people: mode === "serviced_apartment" ? "Guests & Tenants" : "Guests", addLabel: "Add Guest",
    unitLabel: mode === "serviced_apartment" ? "Unit" : "Room", amountLabel: "Booking Amount",
    sources: hybrid ? ["bookings", "stays"] : ["bookings"], stages: SHORT_STAGES,
    tabs: [["residents", "In-House & Upcoming"], ["leads", "Booking Enquiries"], ["applications", "Reservations Pending"], ["moves", "Arrivals / Departures"], ["waitlist", "Waitlist"], ["alumni", "Guest History"]],
  };
}

/** Pure lifecycle bucket for one person row; drives every tab count. */
export type Person = { kind: "stay" | "booking"; status: string; start: string; end: string | null };
export function bucketOf(p: Person, today: string): "current" | "upcoming" | "application" | "alumni" {
  const s = p.status;
  if (["moved_out", "checked_out", "cancelled", "expired", "no_show", "rejected"].includes(s)) return "alumni";
  if (p.kind === "stay" && ["pending", "pending_payment", "held", "application"].includes(s)) return "application";
  if (p.kind === "booking" && ["pending", "pending_payment"].includes(s)) return "application";
  if (p.end && p.end < today) return "alumni";
  return p.start > today ? "upcoming" : "current";
}
