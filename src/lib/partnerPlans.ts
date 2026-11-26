export function yearlySavingsPercent(monthly: number | null, yearly: number | null): number {
  if (!monthly || !yearly || monthly <= 0) return 0;
  const full = monthly * 12;
  return yearly >= full ? 0 : Math.round(((full - yearly) / full) * 100);
}
export function gstBreakup(amount: number, rate = 0.18) {
  const gst = Math.round(amount * rate * 100) / 100;
  return { base: amount, gst, total: Math.round((amount + gst) * 100) / 100 };
}
export function commissionAmount(bookingValue: number, percent: number) {
  return Math.round(bookingValue * percent) / 100;
}
