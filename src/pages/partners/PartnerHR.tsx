import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Loader2, Mail, Plus, QrCode, Search, Trash2, Users, CalendarCheck, Wallet, ShieldCheck, Clock, UserX, Building2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import EmployeeDialog from "@/components/partners/hr/EmployeeDialog";
import { ACTIONS, PREDEFINED_ROLES, STAFF_MODULES, portalSlug, roleName } from "@/config/staffRoles";
import { inr } from "@/lib/hr/payroll";
import { downloadPayslip } from "@/lib/hr/payslipPdf";
import * as hr from "@/services/hospitality/hrService";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { can } from "@/config/staffRoles";

const TABS = [["overview", "Overview"], ["employees", "Employees"], ["roles", "Roles & Permissions"], ["attendance", "Attendance"], ["shifts", "Shifts"], ["leave", "Leave"], ["payroll", "Payroll"], ["portal", "Staff Login Portal"]] as const;
const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const monthEnd = (d = new Date()) => new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().slice(0, 10);
const STATUS_TONE: Record<string, string> = { active: "bg-emerald-100 text-emerald-800", invited: "bg-violet-100 text-violet-800", on_notice: "bg-amber-100 text-amber-800", suspended: "bg-rose-100 text-rose-800", exited: "bg-slate-200 text-slate-700", pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800", calculated: "bg-violet-100 text-violet-800", paid: "bg-emerald-100 text-emerald-800", completed: "bg-emerald-200 text-emerald-900", cancelled: "bg-slate-200 text-slate-700", failed: "bg-rose-100 text-rose-800" };
const Pill = ({ s }: { s: string }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_TONE[s] ?? "bg-muted"}`}>{s.replace("_", " ")}</span>;
const Kpi = ({ icon: I, label, value, sub }: any) => <div className="rounded-xl border bg-card p-4 flex gap-3 items-center"><div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center"><I className="h-5 w-5" /></div><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold">{value}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</div></div>;
const Panel = ({ title, children, action }: any) => <section className="rounded-xl border bg-card p-4 space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3>{action}</div>{children}</section>;

export default function PartnerHR() {
  const { hotelId, userId } = usePartnerHotel();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const setTab = (t: string) => setParams(p => { p.set("tab", t); return p; });
  const qc = useQueryClient();
  const hotelQ = useQuery({ queryKey: ["hr-hotel", hotelId], enabled: !!hotelId, queryFn: async () => (await (supabase as any).from("partner_hotels").select("id,name,city,locality,property_reference,images,is_active,manager_id").eq("id", hotelId).single()).data });
  const dataQ = useQuery({ queryKey: ["hr", hotelId], enabled: !!hotelId, queryFn: () => hr.loadHR(hotelId!) });
  const compQ = useQuery({ queryKey: ["hr-comp", hotelId], enabled: !!hotelId, queryFn: () => hr.loadCompensation(hotelId!) });
  const [from, setFrom] = useState(monthStart()); const [to, setTo] = useState(today());
  const attQ = useQuery({ queryKey: ["hr-att", hotelId, from, to], enabled: !!hotelId, queryFn: () => hr.loadAttendance(hotelId!, from, to) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["hr", hotelId] }); qc.invalidateQueries({ queryKey: ["hr-comp", hotelId] }); qc.invalidateQueries({ queryKey: ["hr-att", hotelId] }); qc.invalidateQueries({ queryKey: ["hr-slips"] }); };
  const [edit, setEdit] = useState<{ open: boolean; emp: hr.Employee | null }>({ open: false, emp: null });
  const [q, setQ] = useState(""); const [dept, setDept] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const d = dataQ.data; const hotel = hotelQ.data;
  const access = useStaffAccess(hotelId, userId, hotel ? hotel.manager_id : undefined);
  const allow = (m: string, a = "view") => access.isOwner || can(access.permissions, m, a);
  const TAB_MODULE: Record<string, string> = { overview: "staff", employees: "staff", roles: "staff", attendance: "attendance", shifts: "attendance", leave: "leave", payroll: "payroll", portal: "staff" };
  const tabs = TABS.filter(([k]) => allow(TAB_MODULE[k]));
  const emps = d?.employees ?? [];
  const nameOf = (id: string) => emps.find(e => e.id === id)?.full_name ?? "—";
  const loginUrl = hotel ? `${window.location.origin}/property/${portalSlug(hotel)}/login` : "";
  const nextCode = `EMP-${String(emps.length + 1).padStart(3, "0")}`;

  const stats = useMemo(() => {
    const t = today(); const att = attQ.data ?? [];
    const onLeave = (d?.leave ?? []).filter(l => l.status === "approved" && l.from_date <= t && l.to_date >= t).length;
    const todayRows = att.filter(a => a.work_date === t);
    const depts = Object.entries(emps.filter(e => !["exited"].includes(e.status)).reduce((a: any, e) => { a[e.department] = (a[e.department] ?? 0) + 1; return a; }, {})) as [string, number][];
    const marked = att.filter(a => a.status !== "holiday" && a.status !== "weekly_off");
    const rate = marked.length ? Math.round(100 * marked.filter(a => ["present", "half_day", "paid_leave"].includes(a.status)).length / marked.length) : null;
    const onTime = att.filter(a => a.check_in); const ot = att.reduce((s, a) => s + (a.overtime_minutes ?? 0), 0);
    return { total: emps.filter(e => e.status !== "exited").length, active: emps.filter(e => e.status === "active").length, notice: emps.filter(e => e.status === "on_notice").length, onLeave, depts, rate,
      onTime: onTime.length ? Math.round(100 * onTime.filter(a => !a.late_minutes).length / onTime.length) : null, otHours: Math.round(ot / 60),
      present: todayRows.filter(a => a.status === "present").length, late: todayRows.filter(a => a.late_minutes > 0).length, absent: todayRows.filter(a => a.status === "absent").length };
  }, [emps, attQ.data, d]);

  const invite = async (e: hr.Employee) => {
    setBusy(e.id);
    try { const r = await hr.inviteEmployee(e.id); toast.success(r.sent ? (r.new_account ? "Welcome email and password-setup invitation sent" : "Welcome email sent — they can sign in with their existing account") : "Access created, but the welcome email could not be sent. Share the login link with them."); refresh(); }
    catch (err: any) { toast.error(err.message); } finally { setBusy(null); }
  };
  const setStatus = async (e: hr.Employee, status: string) => { try { await hr.saveEmployee({ id: e.id, hotel_id: e.hotel_id, status }); toast.success(status === "exited" || status === "suspended" ? "Access revoked" : "Status updated"); refresh(); } catch (err: any) { toast.error(err.message); } };

  if (!hotelId) return <div className="p-6 text-muted-foreground">Select or add a property to manage its staff.</div>;
  if (dataQ.isLoading) return <div className="p-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (dataQ.error) return <div className="p-6"><p className="text-destructive">Could not load HR data.</p><Button className="mt-2" onClick={() => dataQ.refetch()}>Retry</Button></div>;

  const filtered = emps.filter(e => (dept === "all" || e.department === dept) && `${e.full_name} ${e.email} ${e.employee_code} ${e.designation}`.toLowerCase().includes(q.toLowerCase()));

  return <div className="p-4 md:p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3 items-center"><div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 grid place-items-center"><Users className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold">HR & Workforce</h1><p className="text-sm text-muted-foreground">Manage your team, access, attendance, shifts, leave and payroll for {hotel?.name}.</p></div></div>
      {allow("staff", "create") && <Button onClick={() => setEdit({ open: true, emp: null })} className="bg-violet-700 hover:bg-violet-800"><Plus className="h-4 w-4" />Add Employee</Button>}
    </div>
    <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-6 items-center">
      {hotel?.images?.[0] && <img src={hotel.images[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />}
      <div><div className="font-semibold">{hotel?.name}</div><div className="text-xs text-muted-foreground">{hotel?.property_reference} · {hotel?.city}</div></div>
      <div><div className="text-xs text-muted-foreground">Total employees</div><div className="text-xl font-bold">{stats.total}</div></div>
      <div className="flex gap-2 flex-wrap"><Badge variant="outline">Active {stats.active}</Badge><Badge variant="outline">On leave {stats.onLeave}</Badge><Badge variant="outline">On notice {stats.notice}</Badge></div>
      <div><div className="text-xs text-muted-foreground">Departments</div><div className="text-xl font-bold">{stats.depts.length}</div></div>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium ${tab === k ? "bg-violet-700 text-white border-violet-700" : "bg-card hover:bg-violet-50"}`}>{l}</button>)}</div>

    {!tabs.some(([k]) => k === tab) && <p className="text-sm text-muted-foreground">You do not have access to this section.</p>}
    {tab === "overview" && allow("staff") && <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Users} label="Total headcount" value={stats.total} />
        <Kpi icon={CalendarCheck} label="Attendance rate" value={stats.rate == null ? "—" : `${stats.rate}%`} sub="This period, approved & pending" />
        <Kpi icon={Clock} label="On-time check-in" value={stats.onTime == null ? "—" : `${stats.onTime}%`} />
        <Kpi icon={Wallet} label="Latest payroll (net)" value={d!.runs.find(r => r.status !== "cancelled") ? inr(d!.runs.find(r => r.status !== "cancelled").totals?.net ?? 0) : "—"} />
        <Kpi icon={Clock} label="Overtime" value={`${stats.otHours} hrs`} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Workforce by department">{stats.depts.length ? stats.depts.map(([k, v]) => <div key={k} className="space-y-1"><div className="flex justify-between text-sm"><span>{k}</span><span>{v} ({Math.round(100 * v / Math.max(1, stats.total))}%)</span></div><div className="h-2 rounded bg-violet-100"><div className="h-2 rounded bg-violet-600" style={{ width: `${100 * v / Math.max(1, stats.total)}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">Add employees to see this.</p>}</Panel>
        <Panel title="Today's workforce status"><div className="grid grid-cols-2 gap-2 text-center">{[["On duty", stats.present, "bg-emerald-50"], ["On leave", stats.onLeave, "bg-violet-50"], ["Late", stats.late, "bg-amber-50"], ["Absent", stats.absent, "bg-rose-50"]].map(([l, v, c]) => <div key={l as string} className={`rounded-lg p-3 ${c}`}><div className="text-2xl font-bold">{v as number}</div><div className="text-xs">{l}</div></div>)}</div></Panel>
        <Panel title="Leave requests" action={<Button size="sm" variant="ghost" onClick={() => setTab("leave")}>View</Button>}>{d!.leave.filter(l => l.status === "pending").slice(0, 5).map(l => <div key={l.id} className="flex justify-between text-sm"><span>{nameOf(l.employee_id)} · {l.leave_type}</span><span>{l.from_date}</span></div>)}{!d!.leave.some(l => l.status === "pending") && <p className="text-sm text-muted-foreground">No pending requests.</p>}</Panel>
      </div>
      <Announcements hotelId={hotelId} userId={userId!} items={d!.announcements} onDone={refresh} />
    </div>}

    {tab === "employees" && allow("staff") && <Panel title={`Employee directory (${filtered.length})`} action={<div className="flex gap-2"><div className="relative"><Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" /><Input className="pl-7 h-9 w-48" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} /></div><select className={sel} value={dept} onChange={e => setDept(e.target.value)}><option value="all">All departments</option>{Array.from(new Set(emps.map(e => e.department))).map(x => <option key={x}>{x}</option>)}</select></div>}>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-2">Employee</th><th>ID</th><th>Designation</th><th>Roles</th><th>Status</th><th>Access</th><th></th></tr></thead>
        <tbody>{filtered.map(e => <tr key={e.id} className="border-t align-middle"><td className="p-2"><div className="font-medium">{e.full_name}</div><div className="text-xs text-muted-foreground">{e.email}</div></td><td>{e.employee_code}</td><td>{e.designation}<div className="text-xs text-muted-foreground">{e.department}</div></td><td className="text-xs">{e.roles.map(r => roleName(r, d!.roles)).join(", ")}</td><td><Pill s={e.status} /></td>
          <td className="text-xs">{e.user_id ? (e.invited_at ? `Invited ${new Date(e.invited_at).toLocaleDateString()}` : "Linked") : "Not invited"}</td>
          <td className="text-right whitespace-nowrap space-x-1"><Button size="sm" variant="outline" onClick={() => setEdit({ open: true, emp: e })}>Edit</Button>
            {!["exited", "suspended"].includes(e.status) && <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => invite(e)}>{busy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}{e.user_id ? "Resend" : "Invite"}</Button>}
            {["exited", "suspended"].includes(e.status) ? <Button size="sm" variant="ghost" onClick={() => setStatus(e, "active")}>Reactivate</Button> : <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setStatus(e, "suspended")}><UserX className="h-3 w-3" />Suspend</Button>}</td></tr>)}
          {!filtered.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No employees yet. Add your first team member.</td></tr>}</tbody></table></div>
    </Panel>}

    {tab === "roles" && allow("staff") && <RolesTab hotelId={hotelId} custom={d!.roles} onDone={refresh} />}
    {tab === "attendance" && allow("attendance") && <AttendanceTab hotelId={hotelId} emps={emps.filter(e => e.status !== "exited")} rows={attQ.data ?? []} loading={attQ.isLoading} from={from} to={to} setFrom={setFrom} setTo={setTo} onDone={refresh} />}
    {tab === "shifts" && allow("attendance") && <ShiftsTab hotelId={hotelId} shifts={d!.shifts} emps={emps} onDone={refresh} />}
    {tab === "leave" && allow("leave") && <Panel title="Leave requests"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-2">Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>
      {d!.leave.map(l => <tr key={l.id} className="border-t"><td className="p-2">{nameOf(l.employee_id)}</td><td className="capitalize">{l.leave_type.replace("_", " ")}</td><td>{l.from_date} → {l.to_date}</td><td className="max-w-xs truncate">{l.reason}</td><td><Pill s={l.status} /></td><td className="text-right space-x-1">{l.status === "pending" && <><Button size="sm" onClick={async () => { try { await hr.decideLeave(l.id, "approved", userId!); toast.success("Leave approved"); refresh(); } catch (e: any) { toast.error(e.message); } }}>Approve</Button><Button size="sm" variant="outline" onClick={async () => { try { await hr.decideLeave(l.id, "rejected", userId!); refresh(); } catch (e: any) { toast.error(e.message); } }}>Reject</Button></>}</td></tr>)}
      {!d!.leave.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Employees apply for leave from their staff portal; requests appear here.</td></tr>}</tbody></table></div></Panel>}
    {tab === "payroll" && allow("payroll") && <PayrollTab hotel={hotel} emps={emps} comp={compQ.data ?? []} runs={d!.runs} userId={userId!} onDone={refresh} />}
    {tab === "portal" && allow("staff") && <Panel title="Property staff login portal">
      <p className="text-sm text-muted-foreground">Share this permanent link with your team. It works as soon as the property is created — staff can help with setup before JAAGA X approval. Customers still cannot see or book the property until it is approved and published.</p>
      <div className="flex flex-wrap gap-6 items-center"><div className="bg-white p-3 rounded-lg border"><QRCodeSVG id="staff-portal-qr" value={loginUrl} size={140} /></div>
        <div className="space-y-2"><div className="flex gap-2"><Input readOnly value={loginUrl} className="w-[22rem] max-w-full" /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(loginUrl); toast.success("Link copied"); }}><Copy className="h-4 w-4" />Copy</Button></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => window.open(loginUrl, "_blank", "noopener")}><Building2 className="h-4 w-4" />Open portal</Button><Button variant="outline" onClick={() => { const svg = document.getElementById("staff-portal-qr"); if (!svg) return; const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${portalSlug(hotel)}-staff-login-qr.svg`; a.click(); }}><QrCode className="h-4 w-4" />Download QR</Button></div>
          <p className="text-xs flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3 w-3" />Only invited, active employees can sign in, and each sees only what their role allows.</p></div></div>
    </Panel>}

    <EmployeeDialog open={edit.open} onClose={() => setEdit({ open: false, emp: null })} hotelId={hotelId} employee={edit.emp} comp={(compQ.data ?? []).find(c => c.employee_id === edit.emp?.id) ?? null} customRoles={d!.roles} shifts={d!.shifts} canPayroll={allow("payroll", "edit")} nextCode={nextCode} onSaved={refresh} />
  </div>;
}

function Announcements({ hotelId, userId, items, onDone }: any) {
  const [t, setT] = useState(""); const [b, setB] = useState("");
  return <Panel title="HR announcements"><div className="flex flex-wrap gap-2"><Input placeholder="Title" value={t} onChange={e => setT(e.target.value)} className="w-56" /><Input placeholder="Message to all staff" value={b} onChange={e => setB(e.target.value)} className="flex-1 min-w-[14rem]" /><Button disabled={t.trim().length < 2 || !b.trim()} onClick={async () => { try { await hr.postAnnouncement({ hotel_id: hotelId, title: t.trim(), body: b.trim(), created_by: userId }); setT(""); setB(""); onDone(); } catch (e: any) { toast.error(e.message); } }}>Post</Button></div>
    {items.map((a: any) => <div key={a.id} className="text-sm border-t pt-2"><b>{a.title}</b> — {a.body}<span className="text-xs text-muted-foreground"> · {new Date(a.created_at).toLocaleDateString()}</span></div>)}</Panel>;
}

function RolesTab({ hotelId, custom, onDone }: any) {
  const [open, setOpen] = useState<any>(null);
  return <div className="space-y-4">
    <Panel title="Custom roles" action={<Button size="sm" onClick={() => setOpen({ name: "", permissions: {} })}><Plus className="h-4 w-4" />Create role</Button>}>
      {custom.map((r: any) => <div key={r.id} className="flex justify-between items-center border-t pt-2 text-sm"><span className="font-medium">{r.name}</span><span className="text-xs text-muted-foreground">{Object.keys(r.permissions).length} modules</span><span className="space-x-1"><Button size="sm" variant="outline" onClick={() => setOpen(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={async () => { try { await hr.deleteRole(r.id); onDone(); } catch (e: any) { toast.error(e.message); } }}><Trash2 className="h-4 w-4" /></Button></span></div>)}
      {!custom.length && <p className="text-sm text-muted-foreground">No custom roles yet.</p>}</Panel>
    <Panel title="Predefined roles"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{PREDEFINED_ROLES.map(r => <div key={r.key} className="rounded-lg border p-3"><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-muted-foreground">{r.department} · {Object.keys(r.permissions).map(m => STAFF_MODULES.find(x => x.key === m)?.label).join(", ")}</div></div>)}</div></Panel>
    {open && <Dialog open onOpenChange={o => !o && setOpen(null)}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{open.id ? "Edit role" : "Create role"}</DialogTitle></DialogHeader>
      <Input placeholder="Role name, e.g. Night Auditor" value={open.name} onChange={e => setOpen({ ...open, name: e.target.value })} />
      <table className="w-full text-xs"><thead><tr><th className="text-left">Module</th>{ACTIONS.map(a => <th key={a} className="capitalize">{a}</th>)}</tr></thead><tbody>{STAFF_MODULES.map(m => <tr key={m.key} className="border-t"><td className="py-1">{m.label}</td>{ACTIONS.map(a => <td key={a} className="text-center"><Checkbox checked={!!open.permissions[m.key]?.includes(a)} onCheckedChange={() => { const cur = open.permissions[m.key] ?? []; const nx = cur.includes(a) ? cur.filter((x: string) => x !== a) : [...cur, a]; const p = { ...open.permissions, [m.key]: nx }; if (!nx.length) delete p[m.key]; setOpen({ ...open, permissions: p }); }} /></td>)}</tr>)}</tbody></table>
      <DialogFooter><Button disabled={open.name.trim().length < 2} onClick={async () => { try { await hr.saveRole({ id: open.id, hotel_id: hotelId, key: open.key ?? `custom_${open.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, name: open.name.trim(), permissions: open.permissions }); setOpen(null); onDone(); toast.success("Role saved. Re-open employees with this role to apply changes."); } catch (e: any) { toast.error(e.message); } }}>Save role</Button></DialogFooter></DialogContent></Dialog>}
  </div>;
}

function AttendanceTab({ hotelId, emps, rows, loading, from, to, setFrom, setTo, onDone }: any) {
  const [day, setDay] = useState(today());
  const rowFor = (id: string) => rows.find((r: any) => r.employee_id === id && r.work_date === day);
  const mark = async (e: any, status: string) => { try { await hr.markAttendance({ hotel_id: hotelId, employee_id: e.id, work_date: day, status, approved: true, source: rowFor(e.id)?.source ?? "manual", check_in: rowFor(e.id)?.check_in ?? null, check_out: rowFor(e.id)?.check_out ?? null, overtime_minutes: rowFor(e.id)?.overtime_minutes ?? 0, late_minutes: rowFor(e.id)?.late_minutes ?? 0 }); onDone(); } catch (err: any) { toast.error(err.message); } };
  const approveAll = async () => { const pend = rows.filter((r: any) => !r.approved); try { for (const r of pend) await hr.markAttendance({ ...r, approved: true }); toast.success(`${pend.length} record(s) approved`); onDone(); } catch (e: any) { toast.error(e.message); } };
  const exportCsv = () => { const lines = [["Employee", "Date", "Status", "Check-in", "Check-out", "Late min", "OT min", "Approved"], ...rows.map((r: any) => [emps.find((e: any) => e.id === r.employee_id)?.full_name ?? "", r.work_date, r.status, r.check_in ?? "", r.check_out ?? "", r.late_minutes, r.overtime_minutes, r.approved ? "yes" : "no"])]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = `attendance-${from}-${to}.csv`; a.click(); };
  return <div className="space-y-4">
    <Panel title="Mark attendance" action={<Input type="date" value={day} onChange={e => setDay(e.target.value)} className="h-9 w-40" />}>
      <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{emps.map((e: any) => { const r = rowFor(e.id); return <tr key={e.id} className="border-t"><td className="p-2">{e.full_name}<div className="text-xs text-muted-foreground">{r?.check_in ? `In ${new Date(r.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{r?.check_out ? ` · Out ${new Date(r.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{r?.late_minutes ? ` · ${r.late_minutes} min late` : ""}</div></td>
        <td className="text-right space-x-1 whitespace-nowrap">{[["present", "Present"], ["half_day", "Half"], ["absent", "Absent"], ["paid_leave", "Paid leave"], ["unpaid_leave", "Unpaid"], ["weekly_off", "Week off"], ["holiday", "Holiday"]].map(([k, l]) => <button key={k} onClick={() => mark(e, k)} className={`rounded border px-2 py-1 text-xs ${r?.status === k ? "bg-violet-700 text-white" : "hover:bg-violet-50"}`}>{l}</button>)}{r && !r.approved && <Badge variant="outline">Self-marked · needs approval</Badge>}</td></tr>; })}
        {!emps.length && <tr><td className="p-6 text-center text-muted-foreground">No employees.</td></tr>}</tbody></table></div></Panel>
    <Panel title="Attendance records" action={<div className="flex gap-2 items-center"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-40" /><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-40" /><Button size="sm" variant="outline" onClick={approveAll}>Approve all</Button><Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />CSV</Button></div>}>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <p className="text-sm">{rows.length} records · {rows.filter((r: any) => !r.approved).length} awaiting approval. Only approved records are used in payroll.</p>}</Panel>
  </div>;
}

function ShiftsTab({ hotelId, shifts, emps, onDone }: any) {
  const [s, setS] = useState({ name: "", start_time: "06:00", end_time: "14:00", grace_minutes: 10 });
  return <Panel title="Shifts & rosters">
    <div className="flex flex-wrap gap-2 items-end"><Input placeholder="Shift name, e.g. Morning" value={s.name} onChange={e => setS({ ...s, name: e.target.value })} className="w-48" /><Input type="time" value={s.start_time} onChange={e => setS({ ...s, start_time: e.target.value })} className="w-32" /><Input type="time" value={s.end_time} onChange={e => setS({ ...s, end_time: e.target.value })} className="w-32" /><Input type="number" min={0} max={120} value={s.grace_minutes} onChange={e => setS({ ...s, grace_minutes: Number(e.target.value) })} className="w-24" title="Grace minutes" /><Button disabled={s.name.trim().length < 2} onClick={async () => { try { await hr.saveShift({ ...s, hotel_id: hotelId, name: s.name.trim() }); setS({ ...s, name: "" }); onDone(); } catch (e: any) { toast.error(e.message); } }}>Add shift</Button></div>
    {shifts.map((x: any) => { const n = emps.filter((e: any) => e.shift_id === x.id && e.status !== "exited").length; return <div key={x.id} className="flex justify-between items-center border-t pt-2 text-sm"><span><b>{x.name}</b> {x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)} · grace {x.grace_minutes} min</span><span>{n} staff</span><Button size="sm" variant="ghost" onClick={async () => { try { await hr.deleteShift(x.id); onDone(); } catch (e: any) { toast.error(e.message); } }}><Trash2 className="h-4 w-4" /></Button></div>; })}
    <p className="text-xs text-muted-foreground">Assign staff to a shift from their profile. Late arrivals and overtime are measured against it when staff check in and out.</p>
  </Panel>;
}

function PayrollTab({ hotel, emps, comp, runs, userId, onDone }: any) {
  const [start, setStart] = useState(monthStart()); const [end, setEnd] = useState(monthEnd());
  const payable = emps.filter((e: any) => ["active", "on_notice", "invited"].includes(e.status));
  const [picked, setPicked] = useState<string[] | null>(null); const ids = picked ?? payable.map((e: any) => e.id);
  const [dept, setDept] = useState("all"); const [unmarked, setUnmarked] = useState(false); const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null); const run = runs.find((r: any) => r.id === runId);
  const slipsQ = useQuery({ queryKey: ["hr-slips", runId], enabled: !!runId, queryFn: () => hr.loadPayslips(runId!) });
  const [pay, setPay] = useState<any>(null);
  const live = runs.filter((r: any) => r.status !== "cancelled");
  const sum = (k: string) => live.slice(0, 1).reduce((a: number, r: any) => a + (r.totals?.[k] ?? 0), 0);
  const generate = async () => {
    const chosen = ids.filter((id: string) => dept === "all" || emps.find((e: any) => e.id === id)?.department === dept);
    if (!chosen.length) { toast.error("Select at least one employee"); return; }
    const missing = chosen.filter((id: string) => !comp.some((c: any) => c.employee_id === id)); if (missing.length) toast.warning(`${missing.length} employee(s) have no salary structure and will show ₹0`);
    setBusy(true); try { const r = await hr.createPayrollRun(hotel.id, userId, start, end, chosen, unmarked); toast.success("Payroll calculated — review before approving"); onDone(); setRunId(r.id); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const step = async (s: string) => { try { await hr.advancePayroll(runId!, s); toast.success(s === "approved" ? "Payroll approved — employees notified" : s === "completed" ? "Payroll completed" : "Payroll cancelled"); onDone(); } catch (e: any) { toast.error(e.message); } };
  const bankFile = () => { const rows = (slipsQ.data ?? []).filter((s: any) => s.payment_status !== "paid").map((s: any) => { const e = emps.find((x: any) => x.id === s.employee_id); const b = comp.find((c: any) => c.employee_id === s.employee_id)?.bank ?? {}; return [e?.employee_code, b.holder ?? e?.full_name, b.account ?? "", b.ifsc ?? "", s.net, `Salary ${s.period_start}`]; }); const csv = [["Employee ID", "Beneficiary", "Account", "IFSC", "Amount", "Narration"], ...rows].map(l => l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `bank-transfer-${run.period_start}.csv`; a.click(); };
  const STEPS = ["Attendance verification", "Salary calculation", "Payroll review", "Approval", "Disbursement", "Payslips", "Completed"];
  const stepIdx = !run ? 0 : run.status === "calculated" ? 2 : run.status === "approved" ? 4 : run.status === "paid" ? 5 : run.status === "completed" ? 6 : 0;

  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Kpi icon={Users} label="Payable employees" value={payable.length} /><Kpi icon={Wallet} label="Latest gross" value={inr(sum("gross"))} /><Kpi icon={Wallet} label="Latest deductions" value={inr(sum("deductions"))} /><Kpi icon={Wallet} label="Latest net payroll" value={inr(sum("net"))} sub={live[0] ? `${live[0].period_start} · ${live[0].status}` : "No runs yet"} /></div>
    <Panel title="Run payroll">
      <div className="flex flex-wrap gap-2 items-end"><div><div className="text-xs">From</div><Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-9 w-40" /></div><div><div className="text-xs">To</div><Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-9 w-40" /></div>
        <select className={sel} value={dept} onChange={e => setDept(e.target.value)}><option value="all">All departments</option>{Array.from(new Set(emps.map((e: any) => e.department))).map((x: any) => <option key={x}>{x}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={unmarked} onCheckedChange={v => setUnmarked(!!v)} />Count days without attendance as present</label>
        <Button onClick={generate} disabled={busy} className="bg-violet-700 hover:bg-violet-800">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Calculate payroll</Button></div>
      <div className="flex flex-wrap gap-2">{payable.map((e: any) => <label key={e.id} className="flex items-center gap-1 text-xs border rounded px-2 py-1"><Checkbox checked={ids.includes(e.id)} onCheckedChange={() => setPicked(ids.includes(e.id) ? ids.filter((x: string) => x !== e.id) : [...ids, e.id])} />{e.full_name}</label>)}</div>
      <p className="text-xs text-muted-foreground">Uses approved attendance only. Employees already paid for the same period are skipped so nobody is paid twice.</p>
    </Panel>
    <Panel title="Payroll runs">{runs.map((r: any) => <button key={r.id} onClick={() => setRunId(r.id)} className={`w-full flex justify-between items-center border rounded-lg p-2 text-sm ${runId === r.id ? "border-violet-600 bg-violet-50" : ""}`}><span>{r.period_start} → {r.period_end}</span><span>{r.totals?.employees ?? 0} staff · {inr(r.totals?.net ?? 0)}</span><Pill s={r.status} /></button>)}{!runs.length && <p className="text-sm text-muted-foreground">No payroll runs yet.</p>}</Panel>
    {run && <Panel title={`Payroll ${run.period_start} → ${run.period_end}`} action={<div className="flex gap-2 flex-wrap">{run.status === "calculated" && <><Button size="sm" onClick={() => step("approved")}>Approve payroll</Button><Button size="sm" variant="outline" onClick={() => step("cancelled")}>Cancel & recalculate</Button></>}{["approved", "paid"].includes(run.status) && <><Button size="sm" variant="outline" onClick={bankFile}><Download className="h-4 w-4" />Bank transfer file</Button><Button size="sm" onClick={() => step("completed")}>Mark completed</Button></>}</div>}>
      <div className="flex gap-1 flex-wrap text-xs">{STEPS.map((s, i) => <span key={s} className={`rounded-full px-2 py-1 ${i <= stepIdx ? "bg-violet-700 text-white" : "bg-muted"}`}>{i + 1}. {s}</span>)}</div>
      {slipsQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-2">Employee</th><th>Paid days</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Payment</th><th></th></tr></thead><tbody>
        {(slipsQ.data ?? []).map((s: any) => { const e = emps.find((x: any) => x.id === s.employee_id); const c = comp.find((x: any) => x.employee_id === s.employee_id); return <tr key={s.id} className="border-t"><td className="p-2">{e?.full_name}{s.breakdown?.no_salary && <div className="text-xs text-rose-700">No salary structure</div>}{c && !c.bank_verified && <div className="text-xs text-amber-700">Bank not verified</div>}</td><td>{s.attendance?.paidDays}</td><td>{inr(s.gross)}</td><td>{inr(s.deductions)}</td><td className="font-semibold">{inr(s.net)}</td><td><Pill s={s.payment_status} />{s.payment_reference && <div className="text-xs">Ref {s.payment_reference}</div>}</td>
          <td className="text-right space-x-1 whitespace-nowrap">{["approved", "paid"].includes(run.status) && s.payment_status !== "paid" && <Button size="sm" variant="outline" onClick={() => setPay({ slip: s, method: "bank_transfer", reference: "" })}>Record payment</Button>}<Button size="sm" variant="ghost" onClick={() => downloadPayslip(s, e, { name: hotel.name, city: hotel.city, reference: hotel.property_reference }, run)}><Download className="h-4 w-4" /></Button></td></tr>; })}</tbody></table></div>}
    </Panel>}
    {pay && <Dialog open onOpenChange={o => !o && setPay(null)}><DialogContent><DialogHeader><DialogTitle>Record salary payment — {inr(pay.slip.net)}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Pay through your bank or UPI, then record the transaction reference here. JAAGA X does not move salary money itself.</p>
      <select className={sel} value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}>{[["bank_transfer", "Bank transfer (NEFT/IMPS/RTGS)"], ["upi", "UPI"], ["cheque", "Cheque"], ["cash", "Cash"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <Input placeholder="Payment reference / UTR" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} />
      <DialogFooter><Button variant="outline" onClick={async () => { try { await hr.recordPayment(pay.slip.id, "failed", pay.method, pay.reference); setPay(null); onDone(); } catch (e: any) { toast.error(e.message); } }}>Mark failed</Button><Button disabled={!pay.reference.trim()} onClick={async () => { try { await hr.recordPayment(pay.slip.id, "paid", pay.method, pay.reference.trim()); toast.success("Payment recorded — employee notified"); setPay(null); onDone(); } catch (e: any) { toast.error(e.message); } }}>Mark paid</Button></DialogFooter></DialogContent></Dialog>}
  </div>;
}
