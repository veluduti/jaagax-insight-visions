// Property HR, attendance and payroll data. Access is enforced by row-level security (has_hotel_permission).
import { supabase } from "@/integrations/supabase/client";
import { calculatePay, daysInPeriod, type PayType } from "@/lib/hr/payroll";
const db = supabase as any;
const fail = (e: any) => { if (e) throw new Error(e.message || "Request failed"); };

export type Employee = {
  id: string; hotel_id: string; user_id: string | null; employee_code: string; full_name: string; email: string; phone: string | null;
  designation: string; department: string; joining_date: string; employment_type: string; pay_type: PayType; roles: string[];
  permissions: Record<string, string[]>; status: string; shift_id: string | null; probation_end: string | null; exit_date: string | null;
  emergency_contact: any; invited_at: string | null; created_at: string;
};
export type Compensation = { employee_id: string; hotel_id: string; salary: any; statutory: any; bank: any; bank_verified: boolean; revisions: any[] };

export async function loadHR(hotelId: string) {
  const [emps, roles, shifts, leave, runs, ann] = await Promise.all([
    db.from("hotel_employees").select("*").eq("hotel_id", hotelId).order("created_at"),
    db.from("hotel_staff_roles").select("*").eq("hotel_id", hotelId).order("name"),
    db.from("hotel_shifts").select("*").eq("hotel_id", hotelId).order("start_time"),
    db.from("hotel_leave_requests").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(200),
    db.from("hotel_payroll_runs").select("*").eq("hotel_id", hotelId).order("period_start", { ascending: false }).limit(24),
    db.from("hotel_hr_announcements").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(20),
  ]);
  for (const r of [emps, roles, shifts, leave, runs, ann]) fail(r.error);
  return { employees: emps.data as Employee[], roles: roles.data as any[], shifts: shifts.data as any[], leave: leave.data as any[], runs: runs.data as any[], announcements: ann.data as any[] };
}

export async function loadAttendance(hotelId: string, from: string, to: string) {
  const { data, error } = await db.from("hotel_attendance").select("*").eq("hotel_id", hotelId).gte("work_date", from).lte("work_date", to).order("work_date", { ascending: false });
  fail(error); return data as any[];
}
export async function loadCompensation(hotelId: string) {
  const { data, error } = await db.from("hotel_employee_compensation").select("*").eq("hotel_id", hotelId);
  fail(error); return (data ?? []) as Compensation[];
}
export async function saveEmployee(e: Partial<Employee> & { hotel_id: string }) {
  const q = e.id ? db.from("hotel_employees").update(e).eq("id", e.id) : db.from("hotel_employees").insert(e);
  const { data, error } = await q.select().single();
  if (error?.code === "23505") throw new Error("An employee with this ID or email already exists at this property");
  fail(error); return data as Employee;
}
export async function saveCompensation(c: Compensation, prev?: Compensation | null) {
  const revisions = [...(prev?.revisions ?? [])];
  if (prev && JSON.stringify(prev.salary) !== JSON.stringify(c.salary)) revisions.push({ at: new Date().toISOString(), from: prev.salary, to: c.salary });
  const { error } = await db.from("hotel_employee_compensation").upsert({ ...c, revisions, updated_at: new Date().toISOString() });
  fail(error);
}
export async function inviteEmployee(employeeId: string) {
  const { data, error } = await supabase.functions.invoke("staff-invite", { body: { employee_id: employeeId, origin: window.location.origin } });
  if (error) { let msg = "Could not send the invitation"; try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep default */ } throw new Error(msg); }
  return data as { sent: boolean; new_account: boolean; login_url: string };
}
export async function saveRole(r: { id?: string; hotel_id: string; key: string; name: string; permissions: any }) {
  const { error } = r.id ? await db.from("hotel_staff_roles").update(r).eq("id", r.id) : await db.from("hotel_staff_roles").insert(r); fail(error);
}
export async function deleteRole(id: string) { const { error } = await db.from("hotel_staff_roles").delete().eq("id", id); fail(error); }
export async function saveShift(s: any) { const { error } = s.id ? await db.from("hotel_shifts").update(s).eq("id", s.id) : await db.from("hotel_shifts").insert(s); fail(error); }
export async function deleteShift(id: string) { const { error } = await db.from("hotel_shifts").delete().eq("id", id); fail(error); }
export async function markAttendance(row: any) {
  const { error } = await db.from("hotel_attendance").upsert(row, { onConflict: "employee_id,work_date" }); fail(error);
}
export async function decideLeave(id: string, status: "approved" | "rejected", userId: string) {
  const { error } = await db.from("hotel_leave_requests").update({ status, decided_by: userId, decided_at: new Date().toISOString() }).eq("id", id); fail(error);
}
export async function requestLeave(row: any) { const { error } = await db.from("hotel_leave_requests").insert(row); fail(error); }
export async function postAnnouncement(row: any) { const { error } = await db.from("hotel_hr_announcements").insert(row); fail(error); }
export async function punchAttendance(hotelId: string) { const { data, error } = await db.rpc("staff_attendance_punch", { _hotel: hotelId }); fail(error); return data; }

/** Step 1–3 of the workflow: verify attendance → calculate → save a run for review. */
export async function createPayrollRun(hotelId: string, userId: string, start: string, end: string, employeeIds: string[], unmarkedAsPresent: boolean) {
  const [emps, comp, att, existing] = await Promise.all([
    db.from("hotel_employees").select("*").in("id", employeeIds),
    db.from("hotel_employee_compensation").select("*").in("employee_id", employeeIds),
    db.from("hotel_attendance").select("*").in("employee_id", employeeIds).gte("work_date", start).lte("work_date", end),
    db.from("hotel_payslips").select("employee_id").in("employee_id", employeeIds).eq("period_start", start).eq("period_end", end),
  ]);
  for (const r of [emps, comp, att, existing]) fail(r.error);
  const already = new Set((existing.data ?? []).map((x: any) => x.employee_id));
  const periodDays = daysInPeriod(start, end);
  const slips = (emps.data as Employee[]).filter(e => !already.has(e.id)).map(e => {
    const c = (comp.data ?? []).find((x: any) => x.employee_id === e.id);
    const days = (att.data ?? []).filter((a: any) => a.employee_id === e.id && a.approved);
    const r = calculatePay({ payType: e.pay_type, salary: c?.salary ?? {}, statutory: c?.statutory ?? {}, attendance: days, periodDays, unmarkedAsPresent });
    return { employee_id: e.id, hotel_id: hotelId, period_start: start, period_end: end, breakdown: { earnings: r.earnings, deductions: r.deductions, pay_type: e.pay_type, no_salary: !c }, attendance: r.attendance, gross: r.gross, deductions: r.totalDeductions, net: r.net };
  });
  if (!slips.length) throw new Error("Every selected employee already has a payslip for this period");
  const totals = { employees: slips.length, gross: slips.reduce((a, s) => a + s.gross, 0), deductions: slips.reduce((a, s) => a + s.deductions, 0), net: slips.reduce((a, s) => a + s.net, 0), skipped: already.size };
  const { data: run, error } = await db.from("hotel_payroll_runs").insert({ hotel_id: hotelId, period_start: start, period_end: end, created_by: userId, totals }).select().single();
  fail(error);
  const ins = await db.from("hotel_payslips").insert(slips.map(s => ({ ...s, run_id: run.id })));
  if (ins.error) { await db.from("hotel_payroll_runs").delete().eq("id", run.id); throw new Error(ins.error.code === "23505" ? "A payslip already exists for one of these employees in this period" : ins.error.message); }
  return run;
}
export async function loadPayslips(runId: string) { const { data, error } = await db.from("hotel_payslips").select("*").eq("run_id", runId); fail(error); return data as any[]; }
export async function advancePayroll(runId: string, status: string) { const { error } = await db.rpc("payroll_advance", { _run: runId, _status: status }); fail(error); }
export async function recordPayment(slipId: string, status: "paid" | "failed", method: string, reference: string) {
  const { error } = await db.rpc("payroll_record_payment", { _slip: slipId, _status: status, _method: method, _reference: reference }); fail(error);
}
