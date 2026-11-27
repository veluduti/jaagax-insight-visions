import { jsPDF } from "jspdf";
import { EARNING_LABELS, DEDUCTION_LABELS } from "./payroll";
const money = (v: number) => `Rs ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function downloadPayslip(slip: any, emp: { full_name: string; employee_code: string; designation: string; department: string }, property: { name: string; city?: string; reference?: string | null }, run: { status: string }) {
  const d = new jsPDF(); let y = 18;
  d.setFontSize(16); d.text(property.name, 14, y); d.setFontSize(9); y += 6; d.text([property.city, property.reference].filter(Boolean).join(" · "), 14, y);
  d.setFontSize(13); y += 10; d.text(`Payslip ${slip.period_start} to ${slip.period_end}`, 14, y);
  d.setFontSize(10); y += 8;
  [["Employee", emp.full_name], ["Employee ID", emp.employee_code], ["Designation", emp.designation || "-"], ["Department", emp.department], ["Payroll status", run.status], ["Payment", slip.payment_status + (slip.payment_reference ? ` (Ref ${slip.payment_reference})` : "")]].forEach(([k, v]) => { d.text(`${k}: ${v}`, 14, y); y += 6; });
  const a = slip.attendance || {}; y += 2; d.text(`Attendance — paid days ${a.paidDays ?? "-"}, unpaid ${a.unpaidDays ?? "-"}, overtime ${a.overtimeHours ?? 0} h`, 14, y); y += 10;
  d.setFontSize(11); d.text("Earnings", 14, y); d.text("Deductions", 110, y); d.setFontSize(10); y += 6;
  const e = Object.entries(slip.breakdown?.earnings ?? {}); const ded = Object.entries(slip.breakdown?.deductions ?? {});
  for (let i = 0; i < Math.max(e.length, ded.length); i++) {
    if (e[i]) { d.text(EARNING_LABELS[e[i][0]] ?? e[i][0], 14, y); d.text(money(e[i][1] as number), 90, y, { align: "right" }); }
    if (ded[i]) { d.text(DEDUCTION_LABELS[ded[i][0]] ?? ded[i][0], 110, y); d.text(money(ded[i][1] as number), 196, y, { align: "right" }); }
    y += 6;
  }
  y += 6; d.setFontSize(11);
  d.text(`Gross salary: ${money(slip.gross)}`, 14, y); y += 7; d.text(`Total deductions: ${money(slip.deductions)}`, 14, y); y += 7;
  d.setFontSize(13); d.text(`Net salary: ${money(slip.net)}`, 14, y);
  d.setFontSize(8); d.text("Computer-generated payslip from JAAGA X. Loss of pay is already reflected in gross salary.", 14, 285);
  d.save(`payslip-${emp.employee_code}-${slip.period_start}.pdf`);
}
