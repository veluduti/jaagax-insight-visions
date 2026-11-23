// One owner dashboard, configured per property type. Nav, tabs, titles and the
// overview layout all come from here so every type shares the same shell.
import { Building2, BedDouble, CalendarRange, Sparkles, Utensils, Users, ClipboardList, Wallet, Wrench, FileText, IndianRupee, DoorOpen } from "lucide-react";
import { partnerWorkspaceNav } from "@/config/partnerWorkspaceNav";

export type DashboardMode = "hotel" | "resort" | "serviced_apartment" | "pg" | "hostel" | "coliving";
export type NavItem = { label: string; icon: any; to: string; children?: NavItem[] };

export const MODE_LABEL: Record<DashboardMode, string> = {
  hotel: "Hotel", resort: "Resort", serviced_apartment: "Service Apartment", pg: "PG", hostel: "Hostel", coliving: "Co-living",
};

/** Which dashboard a saved business type opens. */
const TYPE_TO_MODE: Record<string, DashboardMode> = {
  hotel: "hotel", boutique: "hotel", guest_house: "hotel", private_room: "hotel", luxury: "hotel", corporate: "hotel", homestay: "hotel", other: "hotel",
  resort: "resort", farm_stay: "resort", villa: "resort",
  serviced_apartment: "serviced_apartment", apartment: "serviced_apartment",
  pg: "pg", hostel: "hostel", shared_room: "hostel", coliving: "coliving", co_living: "coliving",
};

export const LONG_STAY_MODES: DashboardMode[] = ["pg", "hostel", "coliving"];
export const isLongStayMode = (m: DashboardMode) => LONG_STAY_MODES.includes(m);

/** Dashboard types a property supports, in the order its types were saved; hotel when none. */
export function modesForTypes(types: string[] | null | undefined): DashboardMode[] {
  const out: DashboardMode[] = [];
  for (const t of types ?? []) { const m = TYPE_TO_MODE[t]; if (m && !out.includes(m)) out.push(m); }
  return out.length ? out : ["hotel"];
}

/** Use the saved choice when the property supports it, otherwise its first type. */
export function resolveMode(types: string[] | null | undefined, saved: string | null | undefined): DashboardMode {
  const modes = modesForTypes(types);
  return modes.includes(saved as DashboardMode) ? (saved as DashboardMode) : modes[0];
}

const base = (label: string) => partnerWorkspaceNav.find(i => i.label === label) as NavItem;
const common = ["Maintenance", "Inventory & Supplies", "Integrations", "Contacts & Departments"].map(base);

const longStayNav = (unit: string): NavItem[] => [
  base("Dashboard"), base("Multi-Property"), base("Property Setup"),
  { label: "Rooms & Beds", icon: BedDouble, to: "/partners/rooms", children: [
    { label: "Room Types & Sharing", icon: BedDouble, to: "/partners/rooms" },
    { label: "Bed Allocation", icon: CalendarRange, to: "/partners/inventory" },
    { label: "Monthly Rent & Pricing", icon: IndianRupee, to: "/partners/pricing" },
  ] },
  { label: `${unit} & Leads`, icon: Users, to: "/partners/residents", children: [
    { label: `${unit} & Leads`, icon: Users, to: "/partners/residents" },
    { label: "Applications", icon: FileText, to: "/partners/residents?tab=applications" },
    { label: "Move-in / Move-out", icon: DoorOpen, to: "/partners/residents?tab=moves" },
    { label: "Rent Collection", icon: IndianRupee, to: "/partners/rent-payments" },
  ] },
  { label: "Mess & Dining", icon: Utensils, to: "/partners/mess" },
  { label: "Facilities", icon: Sparkles, to: "/partners/workspace/amenities" },
  { label: "Housekeeping", icon: Wrench, to: "/partners/operations?tab=housekeeping" },
  { label: "Visitors & Requests", icon: ClipboardList, to: "/partners/service-requests" },
  ...common,
  { ...base("Billing & Payments"), label: "Rent & Payments" }, base("Payouts"), base("Reports & Analytics"), base("Reviews & Ratings"), base("Settings"),
];

const NAV: Record<DashboardMode, NavItem[]> = {
  hotel: partnerWorkspaceNav as NavItem[],
  resort: partnerWorkspaceNav.map(i => i.label === "Hotel Services" ? { ...i, label: "Resort Services" } : i) as NavItem[],
  serviced_apartment: [
    base("Dashboard"), base("Multi-Property"), base("Property Setup"),
    { label: "Apartments & Units", icon: Building2, to: "/partners/rooms", children: [
      { label: "Apartment Types", icon: Building2, to: "/partners/rooms" },
      { label: "Units", icon: CalendarRange, to: "/partners/inventory" },
      { label: "Daily / Weekly / Monthly Rates", icon: IndianRupee, to: "/partners/pricing" },
      { label: "Rate Plans", icon: Wallet, to: "/partners/rate-plans" },
    ] },
    { label: "Guests, Tenants & Leads", icon: Users, to: "/partners/residents" },
    { label: "Long Stays", icon: Users, to: "/partners/long-stays" },
    base("Amenities & Facilities"),
    { label: "Housekeeping", icon: Wrench, to: "/partners/operations" },
    { ...base("Hotel Services"), label: "Apartment Services" },
    ...common, base("Bookings & Guests"), base("Orders & Service Requests"), { ...base("Billing & Payments"), label: "Rent & Payments" }, base("Payouts"), base("Reports & Analytics"), base("Reviews & Ratings"), base("Settings"),
  ],
  pg: longStayNav("Residents"),
  hostel: longStayNav("Students & Residents"),
  coliving: longStayNav("Members"),
};
export const navForMode = (m: DashboardMode) => NAV[m];

export const TITLE: Record<DashboardMode, string> = {
  hotel: "Hotel Partner Dashboard", resort: "Resort Partner Dashboard", serviced_apartment: "Service Apartment Dashboard",
  pg: "PG Owner Dashboard", hostel: "Hostel Owner Dashboard", coliving: "Co-living Owner Dashboard",
};

/** Overview tabs for hotel-style dashboards. */
export function overviewTabsForMode(m: DashboardMode, tabs: NavItem[]): NavItem[] {
  if (m === "resort") return tabs.map(t => t.label === "Services" ? { ...t, label: "Resort Services" } : t);
  if (m === "serviced_apartment") return [
    tabs[0], { label: "Apartments & Rates", icon: Building2, to: "/partners/rooms" }, { label: "Long Stays", icon: Users, to: "/partners/long-stays" },
    ...tabs.filter(t => ["Amenities", "Services", "Location", "Reviews", "Policies", "FAQs"].includes(t.label)),
  ];
  return tabs;
}

export const LONG_STAY_COPY: Record<"pg" | "hostel" | "coliving", { badge: string; people: string; subtitle: string }> = {
  pg: { badge: "PG", people: "Residents", subtitle: "Manage residents, beds, rent, mess, visitors and the resident app." },
  hostel: { badge: "Hostel", people: "Students / Residents", subtitle: "Manage room and bed allocation, students, payments, visitors and facilities." },
  coliving: { badge: "Co-living", people: "Members", subtitle: "Manage members, shared rooms, rent, community services and requests." },
};

export const modeStorageKey = (hotelId: string) => `partner_dashboard_mode:${hotelId}`;
