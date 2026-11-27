// Property staff modules, actions and predefined roles. Permissions are stored per employee as
// { module: [actions] } and enforced in the database by has_hotel_permission.
export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "manage"] as const;
export type Action = typeof ACTIONS[number];
export type Permissions = Record<string, string[]>;

export const STAFF_MODULES: { key: string; label: string; to: string; hr?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", to: "/partners/dashboard" },
  { key: "reservations", label: "Bookings & Guests", to: "/partners/reservations" },
  { key: "front_desk", label: "Front Desk / Check-in", to: "/partners/operations" },
  { key: "residents", label: "Residents & Leads", to: "/partners/residents" },
  { key: "rooms", label: "Rooms & Inventory", to: "/partners/rooms" },
  { key: "rates", label: "Rates & Pricing", to: "/partners/rate-plans" },
  { key: "housekeeping", label: "Housekeeping", to: "/partners/operations?tab=housekeeping" },
  { key: "maintenance", label: "Maintenance", to: "/partners/maintenance" },
  { key: "mess", label: "Mess & Dining", to: "/partners/mess" },
  { key: "visitors", label: "Visitors", to: "/partners/visitors" },
  { key: "supplies", label: "Inventory & Supplies", to: "/partners/supplies" },
  { key: "payments", label: "Billing & Payments", to: "/partners/rent-payments" },
  { key: "reports", label: "Reports & Analytics", to: "/partners/analytics" },
  { key: "staff", label: "Staff & Roles", to: "/partners/hr?tab=employees", hr: true },
  { key: "attendance", label: "Attendance & Shifts", to: "/partners/hr?tab=attendance", hr: true },
  { key: "leave", label: "Leave", to: "/partners/hr?tab=leave", hr: true },
  { key: "payroll", label: "Payroll", to: "/partners/hr?tab=payroll", hr: true },
];

const all: string[] = [...ACTIONS];
const vce = ["view", "create", "edit"];
const grant = (mods: string[], acts: string[]): Permissions => Object.fromEntries(mods.map(m => [m, acts]));
const merge = (...ps: Permissions[]): Permissions => {
  const out: Permissions = {};
  for (const p of ps) for (const [m, a] of Object.entries(p)) out[m] = Array.from(new Set([...(out[m] ?? []), ...a]));
  return out;
};

export const PREDEFINED_ROLES: { key: string; name: string; department: string; permissions: Permissions }[] = [
  { key: "general_manager", name: "General Manager", department: "Management", permissions: grant(STAFF_MODULES.map(m => m.key), all) },
  { key: "property_manager", name: "Property Manager", department: "Management", permissions: merge(grant(STAFF_MODULES.filter(m => !m.hr).map(m => m.key), [...vce, "approve", "export"]), grant(["staff", "attendance", "leave"], ["view", "approve"])) },
  { key: "receptionist", name: "Receptionist", department: "Front Office", permissions: merge(grant(["dashboard", "reservations", "front_desk", "visitors", "residents"], vce)) },
  { key: "front_office_executive", name: "Front Office Executive", department: "Front Office", permissions: grant(["dashboard", "reservations", "front_desk", "visitors"], vce) },
  { key: "hr_manager", name: "HR Manager", department: "Admin & HR", permissions: merge(grant(["dashboard"], ["view"]), grant(["staff", "attendance", "leave"], all), grant(["payroll"], ["view"])) },
  { key: "payroll_manager", name: "Payroll Manager", department: "Finance", permissions: merge(grant(["dashboard", "attendance"], ["view"]), grant(["payroll"], all)) },
  { key: "accountant", name: "Accountant", department: "Finance", permissions: merge(grant(["dashboard", "reports"], ["view", "export"]), grant(["payments"], [...vce, "export"]), grant(["payroll"], ["view", "export"])) },
  { key: "booking_manager", name: "Booking Manager", department: "Front Office", permissions: grant(["dashboard", "reservations", "rooms", "rates", "residents"], [...vce, "approve", "export"]) },
  { key: "housekeeping_manager", name: "Housekeeping Manager", department: "Housekeeping", permissions: merge(grant(["dashboard"], ["view"]), grant(["housekeeping", "supplies"], [...vce, "approve"]), grant(["rooms"], ["view"])) },
  { key: "housekeeping_staff", name: "Housekeeping Staff", department: "Housekeeping", permissions: grant(["housekeeping"], ["view", "edit"]) },
  { key: "maintenance_staff", name: "Maintenance Staff", department: "Maintenance", permissions: grant(["maintenance"], ["view", "edit"]) },
  { key: "security_staff", name: "Security Staff", department: "Security", permissions: grant(["visitors"], vce) },
  { key: "kitchen_manager", name: "Kitchen Manager", department: "F&B / Restaurant", permissions: merge(grant(["mess", "supplies"], [...vce, "approve"])) },
  { key: "chef", name: "Chef", department: "F&B / Restaurant", permissions: grant(["mess"], ["view", "edit"]) },
  { key: "mess_manager", name: "Mess Manager", department: "F&B / Restaurant", permissions: grant(["mess", "supplies"], [...vce, "approve", "export"]) },
  { key: "resident_manager", name: "Resident Manager", department: "Operations", permissions: grant(["dashboard", "residents", "visitors", "front_desk", "maintenance"], [...vce, "approve"]) },
  { key: "supervisor", name: "Supervisor", department: "Operations", permissions: grant(["dashboard", "housekeeping", "maintenance", "front_desk", "attendance"], ["view", "edit", "approve"]) },
];

export const DEPARTMENTS = ["Management", "Front Office", "Housekeeping", "F&B / Restaurant", "Maintenance", "Operations", "Security", "Finance", "Admin & HR", "Others"];

/** Combine the permissions of every role the employee holds (predefined or custom). */
export function permissionsForRoles(roleKeys: string[], custom: { key: string; permissions: Permissions }[] = []): Permissions {
  const lookup = [...PREDEFINED_ROLES, ...custom];
  return merge(...roleKeys.map(k => lookup.find(r => r.key === k)?.permissions ?? {}));
}
export const can = (p: Permissions | null | undefined, module: string, action: string) => !!p?.[module]?.some(a => a === action || a === "manage");
export const roleName = (key: string, custom: { key: string; name: string }[] = []) => [...PREDEFINED_ROLES, ...custom].find(r => r.key === key)?.name ?? key;
export const portalSlug = (h: { id: string; property_reference?: string | null }) => (h.property_reference || h.id).toLowerCase();

/** Which permission module a workspace path belongs to; null means owner-only (setup, portfolio, payouts, settings…). */
const PATH_MODULES: [RegExp, string][] = [
  [/^\/partners\/dashboard/, "dashboard"], [/^\/partners\/hr/, "staff"], [/^\/partners\/reservations/, "reservations"], [/^\/partners\/(operations|service-requests)/, "front_desk"],
  [/^\/partners\/(residents|applications|long-stays)/, "residents"], [/^\/partners\/(rooms|inventory)/, "rooms"], [/^\/partners\/(rate-plans|pricing)/, "rates"],
  [/^\/partners\/maintenance/, "maintenance"], [/^\/partners\/mess/, "mess"], [/^\/partners\/visitors/, "visitors"], [/^\/partners\/supplies/, "supplies"],
  [/^\/partners\/rent-payments/, "payments"], [/^\/partners\/analytics/, "reports"],
];
export function moduleForPath(path: string): string | null {
  if (/tab=housekeeping/.test(path)) return "housekeeping";
  if (/^\/partners\/hr\?tab=(attendance|shifts)/.test(path)) return "attendance";
  if (/^\/partners\/hr\?tab=leave/.test(path)) return "leave";
  if (/^\/partners\/hr\?tab=payroll/.test(path)) return "payroll";
  return PATH_MODULES.find(([re]) => re.test(path))?.[1] ?? null;
}
/** Staff see a path when they hold "view" on its module (the HR page also opens for attendance, leave or payroll viewers). */
export function staffCanOpen(p: Permissions, path: string) {
  const m = moduleForPath(path); if (!m) return false;
  if (m === "staff" && !/tab=/.test(path)) return ["staff", "attendance", "leave", "payroll"].some(x => can(p, x, "view"));
  return can(p, m, "view") || (m === "front_desk" && can(p, "housekeeping", "view"));
}
