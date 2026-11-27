import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, CalendarCheck, Clock, Download, FileText, Home, Loader2, LogOut, Megaphone, User, Wallet, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { usePortal, typeLabel } from "./usePortal";
import { STAFF_MODULES, can, roleName } from "@/config/staffRoles";
import { inr } from "@/lib/hr/payroll";
import { downloadPayslip } from "@/lib/hr/payslipPdf";
import * as hr from "@/services/hospitality/hrService";
const db = supabase as any;
const TABS = [["home", "Dashboard", Home], ["attendance", "My Attendance", CalendarCheck], ["leave", "Leave", FileText], ["payslips", "Payslips", Wallet], ["profile", "My Profile", User]] as const;
const sel = "h-10 rounded-md border border-input bg-background px-3 text-sm";

export default function PropertyStaffPortal() {
  const { slug } = useParams(); const nav = useNavigate(); const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth() as any;
  const [params, setParams] = useSearchParams(); const tab = params.get("tab") ?? "home";
  const portal = usePortal(slug); const p = portal.data;
  const empQ = useQuery({ queryKey: ["ess-emp", p?.id, user?.id], enabled: !!p && !!user, queryFn: async () => (await db.from("hotel_employees").select("*").eq("hotel_id", p!.id).eq("user_id", user.id).maybeSingle()).data });
  const e = empQ.data;
  const ess = useQuery({ queryKey: ["ess", e?.id], enabled: !!e, queryFn: async () => {
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const [att, leave, slips, ann, shift, comp] = await Promise.all([
      db.from("hotel_attendance").select("*").eq("employee_id", e.id).gte("work_date", since).order("work_date", { ascending: false }),
      db.from("hotel_leave_requests").select("*").eq("employee_id", e.id).order("created_at", { ascending: false }),
      db.from("hotel_payslips").select("*, hotel_payroll_runs(status)").eq("employee_id", e.id).order("period_start", { ascending: false }),
      db.from("hotel_hr_announcements").select("*").eq("hotel_id", e.hotel_id).order("created_at", { ascending: false }).limit(10),
      e.shift_id ? db.from("hotel_shifts").select("*").eq("id", e.shift_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from("hotel_employee_compensation").select("salary,statutory,bank_verified").eq("employee_id", e.id).maybeSingle(),
    ]);
    return { att: att.data ?? [], leave: leave.data ?? [], slips: slips.data ?? [], ann: ann.data ?? [], shift: shift.data, comp: comp.data };
  } });
  const [lv, setLv] = useState({ leave_type: "casual", from_date: "", to_date: "", reason: "" }); const [busy, setBusy] = useState(false);

  if (authLoading || portal.isLoading || (user && empQ.isLoading)) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to={`/property/${slug}/login`} replace />;
  if (!p) return <div className="p-10 text-center">Property not found.</div>;
  if (!e || !["active", "on_notice", "invited"].includes(e.status)) return <div className="min-h-screen grid place-items-center text-center p-6"><div><h1 className="text-xl font-semibold">No access to {p.name}</h1><p className="text-sm text-muted-foreground mt-1">Your access may have been revoked. Contact your property owner.</p><Button className="mt-3" variant="outline" onClick={async () => { await supabase.auth.signOut(); nav(`/property/${slug}/login`); }}>Sign out</Button></div></div>;
  if (e.must_change_password) return <Navigate to={`/property/${slug}/set-password`} replace />;

  const d = ess.data; const todayKey = new Date().toISOString().slice(0, 10); const todayRow = d?.att.find((a: any) => a.work_date === todayKey);
  const modules = STAFF_MODULES.filter(m => can(e.permissions, m.key, "view"));
  const openModule = (to: string) => { localStorage.setItem("partner_active_property", p.id); nav(to); };
  const punch = async () => { setBusy(true); try { await hr.punchAttendance(p.id); toast.success(todayRow?.check_in ? "Checked out" : "Checked in"); qc.invalidateQueries({ queryKey: ["ess", e.id] }); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); } };
  const applyLeave = async () => {
    if (!lv.from_date || !lv.to_date || lv.to_date < lv.from_date) { toast.error("Choose valid leave dates"); return; }
    try { await hr.requestLeave({ ...lv, reason: lv.reason.trim().slice(0, 500), hotel_id: p.id, employee_id: e.id }); toast.success("Leave request sent"); setLv({ leave_type: "casual", from_date: "", to_date: "", reason: "" }); qc.invalidateQueries({ queryKey: ["ess", e.id] }); } catch (err: any) { toast.error(err.message); }
  };
  const leaveDays = (t: string) => (d?.leave ?? []).filter((l: any) => l.status === "approved" && l.leave_type === t && l.from_date.startsWith(String(new Date().getFullYear()))).reduce((s: number, l: any) => s + (new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000 + 1, 0);

  return <div className="min-h-screen bg-violet-50/40 md:flex">
    <aside className="md:w-60 bg-[#1b1240] text-white p-4 space-y-4 md:min-h-screen">
      <div className="text-xl font-black">JAAGA <span className="text-emerald-400">X</span></div>
      <div className="flex gap-2 items-center">{p.image && <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />}<div className="text-xs"><div className="font-semibold">{p.name}</div><div className="opacity-70">{p.property_reference ?? typeLabel(p.business_types)}</div></div></div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto">{TABS.map(([k, l, I]) => <button key={k} onClick={() => setParams({ tab: k })} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${tab === k ? "bg-violet-600" : "hover:bg-white/10"}`}><I className="h-4 w-4" />{l}</button>)}
        {modules.length > 0 && <button onClick={() => openModule(modules[0].to)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10 whitespace-nowrap"><LayoutDashboard className="h-4 w-4" />Work dashboard</button>}</nav>
      <button onClick={async () => { await supabase.auth.signOut(); nav(`/property/${slug}/login`); }} className="flex items-center gap-2 text-sm opacity-80"><LogOut className="h-4 w-4" />Sign out</button>
    </aside>
    <main className="flex-1 p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2"><div><h1 className="text-2xl font-bold">Welcome, {e.full_name}!</h1><p className="text-sm text-muted-foreground">{e.designation || e.roles.map((r: string) => roleName(r)).join(", ")} – {p.name}</p></div><span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm capitalize">{e.status.replace("_", " ")}</span></div>
      {ess.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : ess.error ? <p className="text-destructive">Could not load your details.</p> : <>
        {tab === "home" && <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4"><Clock className="h-5 w-5 text-violet-700" /><div className="text-xs text-muted-foreground mt-1">Today</div><div className="font-semibold">{todayRow?.check_in ? `In ${new Date(todayRow.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${todayRow.check_out ? ` · Out ${new Date(todayRow.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}` : "Not checked in"}</div>
              {!todayRow?.check_out && <Button size="sm" className="mt-2 bg-violet-700 hover:bg-violet-800" disabled={busy} onClick={punch}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{todayRow?.check_in ? "Check out" : "Check in"}</Button>}</div>
            <div className="rounded-xl border bg-card p-4"><CalendarCheck className="h-5 w-5 text-violet-700" /><div className="text-xs text-muted-foreground mt-1">My shift</div><div className="font-semibold">{d.shift ? `${d.shift.name} ${d.shift.start_time.slice(0, 5)}–${d.shift.end_time.slice(0, 5)}` : "Not assigned"}</div></div>
            <div className="rounded-xl border bg-card p-4"><Wallet className="h-5 w-5 text-violet-700" /><div className="text-xs text-muted-foreground mt-1">Latest payslip</div><div className="font-semibold">{d.slips[0] ? `${inr(d.slips[0].net)} · ${d.slips[0].payment_status}` : "None yet"}</div></div>
          </div>
          {modules.length > 0 && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold mb-3">Quick access</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{modules.map(m => <button key={m.key} onClick={() => openModule(m.to)} className="rounded-lg border p-3 text-sm hover:bg-violet-50 text-left">{m.label}</button>)}</div></section>}
          <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold mb-2 flex items-center gap-2"><Megaphone className="h-4 w-4" />Announcements</h2>{d.ann.map((a: any) => <div key={a.id} className="text-sm border-t py-2"><b>{a.title}</b> — {a.body}</div>)}{!d.ann.length && <p className="text-sm text-muted-foreground">No announcements.</p>}</section>
        </div>}
        {tab === "attendance" && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold mb-2">Last 60 days</h2><table className="w-full text-sm"><tbody>{d.att.map((a: any) => <tr key={a.id} className="border-t"><td className="py-2">{a.work_date}</td><td className="capitalize">{a.status.replace("_", " ")}</td><td>{a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} – {a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td><td>{a.late_minutes ? `${a.late_minutes} min late` : ""}</td><td>{a.overtime_minutes ? `OT ${Math.round(a.overtime_minutes / 6) / 10} h` : ""}</td><td className="text-xs">{a.approved ? "Approved" : "Pending approval"}</td></tr>)}</tbody></table>{!d.att.length && <p className="text-sm text-muted-foreground">No attendance yet.</p>}</section>}
        {tab === "leave" && <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{["annual", "sick", "casual", "unpaid"].map(t => <div key={t} className="rounded-xl border bg-card p-3"><div className="text-xs capitalize text-muted-foreground">{t} leave taken {new Date().getFullYear()}</div><div className="text-xl font-bold">{leaveDays(t)}</div></div>)}</div>
          <section className="rounded-xl border bg-card p-4 space-y-2"><h2 className="font-semibold">Apply for leave</h2><div className="flex flex-wrap gap-2"><select className={sel} value={lv.leave_type} onChange={x => setLv({ ...lv, leave_type: x.target.value })}>{[["casual", "Casual"], ["sick", "Sick"], ["annual", "Annual"], ["comp_off", "Comp off"], ["unpaid", "Unpaid"], ["other", "Other"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Input type="date" className="w-40" value={lv.from_date} onChange={x => setLv({ ...lv, from_date: x.target.value })} /><Input type="date" className="w-40" value={lv.to_date} onChange={x => setLv({ ...lv, to_date: x.target.value })} /><Input placeholder="Reason" className="flex-1 min-w-[12rem]" value={lv.reason} onChange={x => setLv({ ...lv, reason: x.target.value })} /><Button onClick={applyLeave}>Submit</Button></div></section>
          <section className="rounded-xl border bg-card p-4">{d.leave.map((l: any) => <div key={l.id} className="flex justify-between text-sm border-t py-2"><span className="capitalize">{l.leave_type.replace("_", " ")} · {l.from_date} → {l.to_date}</span><span className="capitalize">{l.status}</span></div>)}{!d.leave.length && <p className="text-sm text-muted-foreground">No leave requests.</p>}</section>
        </div>}
        {tab === "payslips" && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold mb-2">My payslips</h2>{d.slips.map((s: any) => <div key={s.id} className="flex flex-wrap justify-between items-center border-t py-2 text-sm gap-2"><span>{s.period_start} → {s.period_end}</span><span>Gross {inr(s.gross)} · Net <b>{inr(s.net)}</b></span><span className="capitalize">{s.payment_status}</span><Button size="sm" variant="outline" onClick={() => downloadPayslip(s, e, { name: p.name, city: p.city, reference: p.property_reference }, { status: s.hotel_payroll_runs?.status ?? "approved" })}><Download className="h-4 w-4" />PDF</Button></div>)}{!d.slips.length && <p className="text-sm text-muted-foreground">Payslips appear here once payroll is approved.</p>}</section>}
        {tab === "profile" && <section className="rounded-xl border bg-card p-4 grid sm:grid-cols-2 gap-3 text-sm">{[["Employee ID", e.employee_code], ["Email", e.email], ["Mobile", e.phone ?? "—"], ["Designation", e.designation], ["Department", e.department], ["Joined", e.joining_date], ["Employment type", e.employment_type.replace("_", " ")], ["Roles", e.roles.map((r: string) => roleName(r)).join(", ")], ["Probation ends", e.probation_end ?? "—"], ["Bank verified", d.comp ? (d.comp.bank_verified ? "Yes" : "No") : "—"]].map(([k, v]) => <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium capitalize-first">{v}</div></div>)}<p className="sm:col-span-2 text-xs text-muted-foreground"><Bell className="h-3 w-3 inline" /> To correct your details or salary, contact your HR manager.</p></section>}
      </>}
    </main>
  </div>;
}
