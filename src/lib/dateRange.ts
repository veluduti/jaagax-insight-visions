// Shared helpers for check-in / check-out date range constraints.
// Rule: Check-out date must always be strictly after the Check-in date.

export const CHECKOUT_AFTER_CHECKIN_MSG =
  "Check-out date must be after the Check-in date.";

/** Returns the ISO (yyyy-mm-dd) date one day after the given ISO date, or "" if empty. */
export function nextDayISO(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Returns the ISO (yyyy-mm-dd) date one day after the given Date, as a Date. */
export function nextDay(date?: Date | null): Date | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/** True when both dates are set and checkout is strictly after checkin. */
export function isValidDateRangeISO(checkIn?: string, checkOut?: string): boolean {
  if (!checkIn || !checkOut) return false;
  return new Date(checkOut).getTime() > new Date(checkIn).getTime();
}

export function isValidDateRange(checkIn?: Date | null, checkOut?: Date | null): boolean {
  if (!checkIn || !checkOut) return false;
  return checkOut.getTime() > checkIn.getTime();
}
