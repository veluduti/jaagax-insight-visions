import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ACTIONS, DEPARTMENTS, PREDEFINED_ROLES, STAFF_MODULES, permissionsForRoles, type Permissions } from "@/config/staffRoles";
import { DEDUCTION_LABELS, EARNING_LABELS } from "@/lib/hr/payroll";
import { saveCompensation, saveEmployee, type Compensation, type Employee } from "@/services/hospitality/hrService";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^\+?[0-9 -]{7,20}$/, "Enter a valid mobile number").or(z.literal("")),
  employee_code: z.string().trim().min(1, "Enter an employee ID").max(30),
});
const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const SALARY_KEYS = ["basic", "hra", "da", "conveyance", "special", "food", "accommodation", "incentives", "bonus", "commission", "reimbursement", "overtime_rate", "weekly_rate", "daily_rate", "hourly_rate", "contract_amount"];
const DED_KEYS = ["advance_recovery", "loan_recovery", "other_deduction"];

export default function EmployeeDialog({ open, onClose, hotelId, employee, comp, customRoles, shifts, canPayroll, nextCode, onSaved }: {
  open: boolean; onClose: () => void; hotelId: string; employee: Employee | null; comp: Compensation | null; customRoles: any[]; shifts: any[]; canPayroll: boolean; nextCode: string; onSaved: () => void;
}) {
  const [f, setF] = useState<any>({}); const [perm, setPerm] = useState<Permissions>({}); const [c, setC] = useState<any>({ salary: {}, statutory: {}, bank: {} }); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(employee ? { ...employee, phone: employee.phone ?? "", emergency_contact: employee.emergency_contact ?? {} } : { employee_code: nextCode, full_name: "", email: "", phone: "", designation: "", department: "Front Office", joining_date: new Date().toISOString().slice(0, 10), employment_type: "full_time", pay_type: "monthly", roles: [], status: "invited", emergency_contact: {} });
    setPerm(employee?.permissions ?? {});
    setC(comp ? { ...comp } : { salary: {}, statutory: { pf_rate: 12, pf_wage_cap: 15000, esi_rate: 0.75, esi_threshold: 21000 }, bank: {}, bank_verified: false });
  }, [open, employee, comp, nextCode]);
  const allRoles = [...PREDEFINED_ROLES, ...customRoles];
  const toggleRole = (k: string) => { const roles = f.roles.includes(k) ? f.roles.filter((r: string) => r !== k) : [...f.roles, k]; setF({ ...f, roles, designation: f.designation || allRoles.find(r => r.key === k)?.name || "" }); setPerm(permissionsForRoles(roles, customRoles)); };
  const togglePerm = (m: string, a: string) => setPerm(p => { const cur = p[m] ?? []; const next = cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]; const o = { ...p, [m]: next }; if (!next.length) delete o[m]; return o; });
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));

  const save = async () => {
    const v = schema.safeParse(f); if (!v.success) { toast.error(v.error.issues[0].message); return; }
    if (!f.roles.length) { toast.error("Assign at least one role"); return; }
    if (c.bank?.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(c.bank.ifsc).toUpperCase())) { toast.error("IFSC must be 11 characters, e.g. HDFC0001234"); return; }
    setBusy(true);
    try {
      const { id, hotel_id, user_id, invited_at, created_at, updated_at, ...rest } = f;
      const saved = await saveEmployee({ ...(id ? { id } : {}), ...rest, hotel_id: hotelId, email: f.email.trim().toLowerCase(), phone: f.phone || null, shift_id: f.shift_id || null, probation_end: f.probation_end || null, permissions: perm });
      if (canPayroll) await saveCompensation({ employee_id: saved.id, hotel_id: hotelId, salary: c.salary, statutory: c.statutory, bank: { ...c.bank, ifsc: c.bank?.ifsc?.toUpperCase() }, bank_verified: !!c.bank_verified, revisions: comp?.revisions ?? [] }, comp);
      toast.success(employee ? "Employee updated" : "Employee added — send the invite to give them access");
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const fld = (k: string, label: string, type = "text") => <div className="space-y-1"><Label>{label}</Label><Input type={type} value={f[k] ?? ""} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>;

  return <Dialog open={open} onOpenChange={o => !o && onClose()}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{employee ? `Edit ${employee.full_name}` : "Add employee"}</DialogTitle></DialogHeader>
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="roles">Roles & access</TabsTrigger>{canPayroll && <TabsTrigger value="salary">Salary & bank</TabsTrigger>}</TabsList>
        <TabsContent value="profile" className="grid sm:grid-cols-2 gap-3">
          {fld("full_name", "Full name")}{fld("email", "Email address", "email")}{fld("phone", "Mobile number")}{fld("employee_code", "Employee ID")}{fld("designation", "Designation")}
          <div className="space-y-1"><Label>Department</Label><select className={sel} value={f.department} onChange={e => setF({ ...f, department: e.target.value })}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
          {fld("joining_date", "Joining date", "date")}
          <div className="space-y-1"><Label>Employment type</Label><select className={sel} value={f.employment_type} onChange={e => setF({ ...f, employment_type: e.target.value })}>{[["full_time", "Full time"], ["part_time", "Part time"], ["contract", "Contract"], ["intern", "Intern"], ["temporary", "Temporary"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="space-y-1"><Label>Shift</Label><select className={sel} value={f.shift_id ?? ""} onChange={e => setF({ ...f, shift_id: e.target.value })}><option value="">No fixed shift</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})</option>)}</select></div>
          {fld("probation_end", "Probation ends", "date")}
          {employee && <div className="space-y-1"><Label>Status</Label><select className={sel} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{[["invited", "Invited"], ["active", "Active"], ["on_notice", "On notice"], ["suspended", "Suspended (access revoked)"], ["exited", "Exited (access revoked)"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
          <div className="space-y-1"><Label>Emergency contact name</Label><Input value={f.emergency_contact?.name ?? ""} onChange={e => setF({ ...f, emergency_contact: { ...f.emergency_contact, name: e.target.value } })} /></div>
          <div className="space-y-1"><Label>Emergency contact phone</Label><Input value={f.emergency_contact?.phone ?? ""} onChange={e => setF({ ...f, emergency_contact: { ...f.emergency_contact, phone: e.target.value } })} /></div>
        </TabsContent>
        <TabsContent value="roles" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-2">{allRoles.map(r => <label key={r.key} className="flex items-center gap-2 text-sm border rounded-md p-2 cursor-pointer"><Checkbox checked={f.roles?.includes(r.key)} onCheckedChange={() => toggleRole(r.key)} />{r.name}</label>)}</div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="text-left p-1">Module</th>{ACTIONS.map(a => <th key={a} className="p-1 capitalize">{a}</th>)}</tr></thead>
            <tbody>{STAFF_MODULES.map(m => <tr key={m.key} className="border-t"><td className="p-1">{m.label}</td>{ACTIONS.map(a => <td key={a} className="text-center p-1"><Checkbox aria-label={`${m.label} ${a}`} checked={!!perm[m.key]?.includes(a)} onCheckedChange={() => togglePerm(m.key, a)} /></td>)}</tr>)}</tbody></table></div>
          <p className="text-xs text-muted-foreground">Choosing roles fills these boxes; you can fine-tune any permission. “Manage” includes every action.</p>
        </TabsContent>
        {canPayroll && <TabsContent value="salary" className="space-y-4">
          <div className="space-y-1 max-w-xs"><Label>Pay basis</Label><select className={sel} value={f.pay_type} onChange={e => setF({ ...f, pay_type: e.target.value })}>{[["monthly", "Monthly"], ["weekly", "Weekly"], ["daily", "Daily"], ["hourly", "Hourly"], ["contract", "Contract (fixed)"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="grid sm:grid-cols-3 gap-3">{SALARY_KEYS.map(k => <div key={k} className="space-y-1"><Label className="text-xs">{k === "overtime_rate" ? "Overtime pay / hour" : EARNING_LABELS[k]} (₹)</Label><Input type="number" min={0} value={c.salary?.[k] ?? ""} onChange={e => setC({ ...c, salary: { ...c.salary, [k]: num(e.target.value) } })} /></div>)}
            {DED_KEYS.map(k => <div key={k} className="space-y-1"><Label className="text-xs">{DEDUCTION_LABELS[k]} (₹ / period)</Label><Input type="number" min={0} value={c.salary?.[k] ?? ""} onChange={e => setC({ ...c, salary: { ...c.salary, [k]: num(e.target.value) } })} /></div>)}</div>
          <div className="grid sm:grid-cols-3 gap-3 border-t pt-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!c.statutory?.pf_enabled} onCheckedChange={v => setC({ ...c, statutory: { ...c.statutory, pf_enabled: !!v } })} />EPF applies</label>
            <div className="space-y-1"><Label className="text-xs">EPF rate %</Label><Input type="number" value={c.statutory?.pf_rate ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, pf_rate: num(e.target.value) } })} /></div>
            <div className="space-y-1"><Label className="text-xs">EPF wage ceiling ₹ (blank = none)</Label><Input type="number" value={c.statutory?.pf_wage_cap ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, pf_wage_cap: num(e.target.value) ?? null } })} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!c.statutory?.esi_enabled} onCheckedChange={v => setC({ ...c, statutory: { ...c.statutory, esi_enabled: !!v } })} />ESI applies</label>
            <div className="space-y-1"><Label className="text-xs">ESI rate %</Label><Input type="number" value={c.statutory?.esi_rate ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, esi_rate: num(e.target.value) } })} /></div>
            <div className="space-y-1"><Label className="text-xs">ESI gross limit ₹</Label><Input type="number" value={c.statutory?.esi_threshold ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, esi_threshold: num(e.target.value) } })} /></div>
            <div className="space-y-1"><Label className="text-xs">Professional Tax ₹ / month (per your state)</Label><Input type="number" value={c.statutory?.pt_amount ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, pt_amount: num(e.target.value) } })} /></div>
            <div className="space-y-1"><Label className="text-xs">TDS ₹ / month</Label><Input type="number" value={c.statutory?.tds_monthly ?? ""} onChange={e => setC({ ...c, statutory: { ...c.statutory, tds_monthly: num(e.target.value) } })} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 border-t pt-3">
            {[["holder", "Account holder"], ["account", "Account number"], ["ifsc", "IFSC"], ["bank", "Bank name"], ["upi", "UPI ID (optional)"]].map(([k, l]) => <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={c.bank?.[k] ?? ""} onChange={e => setC({ ...c, bank: { ...c.bank, [k]: e.target.value } })} /></div>)}
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!c.bank_verified} onCheckedChange={v => setC({ ...c, bank_verified: !!v })} />Bank details verified (e.g. cancelled cheque checked)</label>
          </div>
        </TabsContent>}
      </Tabs>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
