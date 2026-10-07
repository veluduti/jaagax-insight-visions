import { format, isValid, parse } from "date-fns";

export function visitDateLabel(value?: string | null, relative = false): string {
  const raw = value?.slice(0, 10) ?? "";
  const date = parse(raw, "yyyy-MM-dd", new Date());
  if (!isValid(date)) return "Date to be confirmed";
  if (relative) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const difference = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (difference === 0) return "Today";
    if (difference === 1) return "Tomorrow";
  }
  return format(date, "EEE, d MMM yyyy");
}

export function visitTimeLabel(value?: string | null): string {
  const raw = value?.trim() ?? "";
  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  const twentyFourHour = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  const match = twelveHour ?? twentyFourHour;
  if (!match) return "Time to be confirmed";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > (twelveHour ? 12 : 23) || (twelveHour && hour < 1)) return "Time to be confirmed";
  if (twelveHour) hour = hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  return format(date, "h:mm a");
}