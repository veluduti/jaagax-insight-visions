import { describe, it, expect } from "vitest";
import { calculatePay, summariseAttendance } from "./payroll";
const month = (status: string, count: number) => Array.from({ length: count }, () => ({ status }));

describe("payroll", () => {
  it("pays full monthly salary when every day is paid", () => {
    const r = calculatePay({ payType: "monthly", salary: { basic: 20000, hra: 8000 }, statutory: {}, attendance: month("present", 30), periodDays: 30 });
    expect(r.gross).toBe(28000); expect(r.net).toBe(28000);
  });
  it("deducts loss of pay for absent and unpaid leave days", () => {
    const r = calculatePay({ payType: "monthly", salary: { basic: 30000 }, statutory: {}, attendance: [...month("present", 27), ...month("absent", 2), ...month("unpaid_leave", 1)], periodDays: 30 });
    expect(r.deductions.lop).toBe(3000); expect(r.gross).toBe(27000);
  });
  it("counts a half day as half a day of loss of pay", () => {
    expect(summariseAttendance([...month("present", 29), { status: "half_day" }], 30).unpaidDays).toBe(0.5);
  });
  it("treats unmarked days as unpaid unless the run allows them", () => {
    expect(summariseAttendance(month("present", 20), 30).unpaidDays).toBe(10);
    expect(summariseAttendance(month("present", 20), 30, true).unpaidDays).toBe(0);
  });
  it("applies EPF at 12% on basic + DA capped at the wage ceiling", () => {
    const r = calculatePay({ payType: "monthly", salary: { basic: 25000 }, statutory: { pf_enabled: true, pf_rate: 12, pf_wage_cap: 15000 }, attendance: month("present", 30), periodDays: 30 });
    expect(r.deductions.pf).toBe(1800);
  });
  it("applies ESI only when gross is within the threshold", () => {
    const low = calculatePay({ payType: "monthly", salary: { basic: 18000 }, statutory: { esi_enabled: true }, attendance: month("present", 30), periodDays: 30 });
    const high = calculatePay({ payType: "monthly", salary: { basic: 25000 }, statutory: { esi_enabled: true }, attendance: month("present", 30), periodDays: 30 });
    expect(low.deductions.esi).toBe(135); expect(high.deductions.esi).toBeUndefined();
  });
  it("pays overtime hours at the overtime rate", () => {
    const r = calculatePay({ payType: "monthly", salary: { basic: 15000, overtime_rate: 100 }, statutory: {}, attendance: [{ status: "present", overtime_minutes: 150 }, ...month("present", 29)], periodDays: 30 });
    expect(r.earnings.overtime).toBe(250);
  });
  it("pays daily workers only for worked and paid-leave days", () => {
    const r = calculatePay({ payType: "daily", salary: { daily_rate: 800 }, statutory: {}, attendance: [...month("present", 20), ...month("paid_leave", 2), ...month("absent", 3)], periodDays: 25 });
    expect(r.gross).toBe(17600);
  });
  it("pays hourly workers for checked-in hours", () => {
    const r = calculatePay({ payType: "hourly", salary: { hourly_rate: 200 }, statutory: {}, attendance: [{ status: "present", check_in: "2026-11-01T09:00:00Z", check_out: "2026-11-01T17:30:00Z" }], periodDays: 1 });
    expect(r.gross).toBe(1700);
  });
  it("subtracts professional tax, TDS and recoveries from net pay", () => {
    const r = calculatePay({ payType: "monthly", salary: { basic: 20000, advance_recovery: 1000 }, statutory: { pt_amount: 200, tds_monthly: 500 }, attendance: month("present", 30), periodDays: 30 });
    expect(r.totalDeductions).toBe(1700); expect(r.net).toBe(18300);
  });
});
