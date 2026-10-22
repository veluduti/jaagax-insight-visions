/** Round monetary values to paise, matching server-side billing. */
export const roundRupees = (amount: number) => Math.round(amount * 100) / 100;

export function chargeWithGst(base: number, percent: number) {
  const gst = roundRupees(base * percent / 100);
  return { gst, total: roundRupees(base + gst) };
}

/** Existing wallet minimum remains unchanged; never round up to whole rupees. */
export function requiredWalletTopUp(amount: number, balance = 0) {
  if (balance >= amount) return 0;
  return Math.max(roundRupees(amount - balance), 500);
}