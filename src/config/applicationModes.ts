// Applications & Leads pipeline per dashboard mode. Stage keys extend the Residents & Leads
// keys so both screens read the same hotel_leads rows.
import { isLongStayMode, type DashboardMode } from "@/config/dashboardModes";

export type Stage = { key: string; label: string; tone: string };
export type AppConfig = { title: string; subtitle: string; person: string; unit: string; budget: string; date: string; stayTypes: string[]; stages: Stage[]; docs: [string, string][]; long: boolean; convertLabel: string };

const LONG_STAGES: Stage[] = [
  { key: "new", label: "New Leads", tone: "bg-blue-500/10 text-blue-700" }, { key: "contacted", label: "Contacted", tone: "bg-violet-500/10 text-violet-700" },
  { key: "visit", label: "Visit Scheduled", tone: "bg-amber-500/10 text-amber-700" }, { key: "application", label: "Applications", tone: "bg-fuchsia-500/10 text-fuchsia-700" },
  { key: "verification", label: "Under Verification", tone: "bg-orange-500/10 text-orange-700" }, { key: "approved", label: "Approved", tone: "bg-emerald-500/10 text-emerald-700" },
  { key: "converted", label: "Converted", tone: "bg-green-500/15 text-green-800" }, { key: "waitlist", label: "Waitlist", tone: "bg-slate-500/10 text-slate-700" },
  { key: "dropped", label: "Dropped", tone: "bg-red-500/10 text-red-700" },
];
const SHORT_STAGES: Stage[] = [
  { key: "new", label: "Enquiries", tone: LONG_STAGES[0].tone }, { key: "contacted", label: "Follow-up", tone: LONG_STAGES[1].tone },
  { key: "quoted", label: "Quotation Sent", tone: LONG_STAGES[2].tone }, { key: "reservation", label: "Reservation Pending", tone: LONG_STAGES[3].tone },
  { key: "approved", label: "Approved", tone: LONG_STAGES[5].tone }, { key: "converted", label: "Booking Confirmed", tone: LONG_STAGES[6].tone },
  { key: "waitlist", label: "Waitlist", tone: LONG_STAGES[7].tone }, { key: "dropped", label: "Dropped", tone: LONG_STAGES[8].tone },
];
const LONG_DOCS: [string, string][] = [["id", "ID Proof"], ["address", "Address Proof"], ["photo", "Photo"], ["employment", "Employment / Student Proof"], ["agreement", "Agreement"]];

export function applicationConfig(mode: DashboardMode): AppConfig {
  if (isLongStayMode(mode)) {
    const person = mode === "hostel" ? "Student" : mode === "coliving" ? "Member" : "Resident";
    return { title: "Applications & Leads", subtitle: `Capture enquiries, manage applications, schedule visits and convert to ${person.toLowerCase()}s.`, person, unit: "Preferred Room / Bed", budget: "Budget (₹/month)", date: "Move-in Date", long: true, convertLabel: `Convert to ${person}`,
      stayTypes: mode === "hostel" ? ["Hostel (Single)", "Hostel (Double)", "Hostel (Triple)", "Dormitory"] : mode === "coliving" ? ["Private Room", "Shared Room", "Studio"] : ["PG (Single)", "PG (Double)", "PG (Triple)"], stages: LONG_STAGES, docs: LONG_DOCS };
  }
  const apt = mode === "serviced_apartment";
  return { title: apt ? "Enquiries & Applications" : "Booking Enquiries & Leads", subtitle: apt ? "Manage short- and long-term rental enquiries, viewings, tenant applications and reservations." : "Manage booking enquiries, corporate and group requests, quotations and confirmations.",
    person: "Guest", unit: apt ? "Preferred Unit" : "Room Preference", budget: apt ? "Budget (₹)" : "Budget (₹/night)", date: "Check-in", long: false, convertLabel: "Mark Booking Confirmed",
    stayTypes: apt ? ["Short stay", "Monthly rental", "Long-term lease"] : ["Individual", "Corporate", "Group booking", "Event / Wedding"], stages: SHORT_STAGES,
    docs: apt ? [["id", "ID Proof"], ["employment", "Employment Proof"], ["agreement", "Lease Agreement"]] : [["id", "ID Proof"], ["company", "Company Letter"]] };
}

/** KPI groups from stage keys; unknown keys count only in the total. */
export function pipelineCounts(stages: string[], monthConverted: number) {
  const n = (...k: string[]) => stages.filter(s => k.includes(s)).length;
  return { total: stages.length, inProcess: n("application", "reservation", "quoted"), visits: n("visit"), verification: n("verification"), approved: n("approved"), converted: monthConverted, waitlist: n("waitlist"), dropped: n("dropped", "lost") };
}

/** Same person if a phone (digits) or email matches. */
export function findDuplicate<T extends { id: string; phone: string | null; email: string | null }>(rows: T[], phone?: string | null, email?: string | null, ignoreId?: string): T | undefined {
  const d = (p?: string | null) => (p ?? "").replace(/\D/g, "").slice(-10);
  return rows.find(r => r.id !== ignoreId && ((phone && d(phone).length >= 7 && d(r.phone) === d(phone)) || (email && r.email && r.email.toLowerCase() === email.trim().toLowerCase())));
}
