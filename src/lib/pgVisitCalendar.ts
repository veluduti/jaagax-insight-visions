import { startOfDay } from "date-fns";

// Browsing a date does not claim that the manager has published a time slot.
export function isPastPgVisitDate(date: Date, today = new Date()): boolean {
  return !Number.isFinite(date.getTime()) || startOfDay(date) < startOfDay(today);
}