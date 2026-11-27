// Payroll maths shared by the HR page and its tests. All amounts are rupees, rounded to paise.
export type PayType = "monthly" | "weekly" | "daily" | "hourly" | "contract";
export type Salary = Partial<Record<
  | "basic" | "hra" | "da" | "conveyance" | "special" | "food" | "accommodation"
  | "incentives" | "bonus" | "commission" | "reimbursement"
  | "weekly_rate" | "daily_rate" | "hourly_rate" | "contract_amount" | "overtime_rate"
  | "advance_recovery" | "loan_recovery" | "other_deduction", number>>;
export type Statutory = {
  pf_enabled?: boolean; pf_rate?: number; pf_wage_cap?: number | null;
  esi_enabled?: boolean; esi_rate?: number; esi_threshold?: number;
  pt_amount?: number; tds_monthly?: number;
};
export type AttendanceDay = { status: string; check_in?: string | null; check_out?: string | null; overtime_minutes?: number; approved?: boolean };
export type PayInput = { payType: PayType; salary: Salary; statutory: Statutory; attendance: AttendanceDay[]; periodDays: number; unmarkedAsPresent?: boolean };

export const FIXED_EARNINGS = ["basic", "hra", "da", "conveyance", "special", "food", "accommodation"] as const;
export const VARIABLE_EARNINGS = ["incentives", "bonus", "commission", "reimbursement"] as const;
export const EARNING_LABELS: Record<string, string> = {
  basic: "Basic Salary", hra: "HRA", da: "Dearness Allowance", conveyance: "Conveyance Allowance", special: "Special Allowance",
  food: "Food Allowance", accommodation: "Accommodation Allowance", incentives: "Incentives", bonus: "Bonus", commission: "Commission",
  reimbursement: "Reimbursements", overtime: "Overtime Pay", weekly_rate: "Weekly Wage", daily_rate: "Daily Wage", hourly_rate: "Hourly Wage", contract_amount: "Contract Amount",
};
export const DEDUCTION_LABELS: Record<string, string> = {
  lop: "Loss of Pay", pf: "EPF (Employee)", esi: "ESI (Employee)", pt: "Professional Tax", tds: "TDS",
  advance_recovery: "Salary Advance Recovery", loan_recovery: "Loan Recovery", other_deduction: "Other Deductions",
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/** Counts paid and unpaid days from attendance. Unmarked days are unpaid unless the run says otherwise. */
export function summariseAttendance(days: AttendanceDay[], periodDays: number, unmarkedAsPresent = false) {
  let present = 0, half = 0, paidLeave = 0, unpaidLeave = 0, absent = 0, off = 0, otMinutes = 0, minutes = 0;
  for (const d of days) {
    if (d.status === "present") present++;
    else if (d.status === "half_day") half++;
    else if (d.status === "paid_leave") paidLeave++;
    else if (d.status === "unpaid_leave") unpaidLeave++;
    else if (d.status === "absent") absent++;
    else if (d.status === "holiday" || d.status === "weekly_off") off++;
    otMinutes += n(d.overtime_minutes);
    if (d.check_in && d.check_out) minutes += Math.max(0, (new Date(d.check_out).getTime() - new Date(d.check_in).getTime()) / 60000);
  }
  const unmarked = Math.max(0, periodDays - days.length);
  const unpaidDays = absent + unpaidLeave + half * 0.5 + (unmarkedAsPresent ? 0 : unmarked);
  const workedDays = present + half * 0.5 + (unmarkedAsPresent ? unmarked : 0);
  const paidDays = Math.max(0, periodDays - unpaidDays);
  return { present, half, paidLeave, unpaidLeave, absent, off, unmarked, unpaidDays, paidDays, workedDays, overtimeHours: r2(otMinutes / 60), workedHours: r2(minutes / 60) };
}

export function calculatePay(input: PayInput) {
  const { payType, salary: s, statutory: st, periodDays } = input;
  const att = summariseAttendance(input.attendance, periodDays, input.unmarkedAsPresent);
  const earnings: Record<string, number> = {};
  const deductions: Record<string, number> = {};
  const ratio = periodDays > 0 ? att.paidDays / periodDays : 0;

  if (payType === "monthly") {
    for (const k of FIXED_EARNINGS) if (n(s[k])) earnings[k] = r2(n(s[k]));
    const fixed = FIXED_EARNINGS.reduce((a, k) => a + n(s[k]), 0);
    const lop = r2(fixed * (1 - ratio));
    if (lop > 0) deductions.lop = lop;
  } else if (payType === "weekly") {
    earnings.weekly_rate = r2(n(s.weekly_rate) * (att.paidDays / 7));
  } else if (payType === "daily") {
    earnings.daily_rate = r2(n(s.daily_rate) * (att.workedDays + att.paidLeave));
  } else if (payType === "hourly") {
    earnings.hourly_rate = r2(n(s.hourly_rate) * att.workedHours);
  } else {
    earnings.contract_amount = r2(n(s.contract_amount));
  }
  for (const k of VARIABLE_EARNINGS) if (n(s[k])) earnings[k] = r2(n(s[k]));
  const ot = r2(n(s.overtime_rate) * att.overtimeHours);
  if (ot > 0) earnings.overtime = ot;

  const gross = r2(Object.values(earnings).reduce((a, v) => a + v, 0) - (deductions.lop ?? 0));
  // Statutory: PF on earned basic + DA (capped when a wage ceiling is set); ESI when gross is within the threshold.
  if (st.pf_enabled) {
    const pfWage = payType === "monthly" ? (n(s.basic) + n(s.da)) * ratio : gross;
    const base = st.pf_wage_cap ? Math.min(pfWage, st.pf_wage_cap) : pfWage;
    const pf = r2(base * (st.pf_rate ?? 12) / 100);
    if (pf > 0) deductions.pf = pf;
  }
  if (st.esi_enabled && gross > 0 && gross <= (st.esi_threshold ?? 21000)) deductions.esi = r2(gross * (st.esi_rate ?? 0.75) / 100);
  if (n(st.pt_amount) && gross > 0) deductions.pt = r2(n(st.pt_amount));
  if (n(st.tds_monthly)) deductions.tds = r2(n(st.tds_monthly));
  for (const k of ["advance_recovery", "loan_recovery", "other_deduction"] as const) if (n(s[k])) deductions[k] = r2(n(s[k]));

  const totalDeductions = r2(Object.entries(deductions).filter(([k]) => k !== "lop").reduce((a, [, v]) => a + v, 0));
  return { earnings, deductions, gross: Math.max(0, gross), totalDeductions, net: r2(Math.max(0, gross) - totalDeductions), attendance: att };
}

export const daysInPeriod = (start: string, end: string) => Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
export const inr = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
