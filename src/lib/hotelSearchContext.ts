import { isValidDateRangeISO, nextDayISO } from "./dateRange";

/** Expired discovery links start today while keeping their original stay length. */
export function currentHotelSearchDates(params: URLSearchParams, today: string) {
  const raw = params.get("checkin") ?? "";
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw));
  const expired = validStart && raw < today;
  const checkIn = validStart && !expired ? raw : today;
  const end = params.get("checkout") ?? "";
  if (expired && isValidDateRangeISO(raw, end)) {
    const nights = Math.round((Date.parse(end) - Date.parse(raw)) / 86400000);
    const shifted = new Date(`${today}T00:00:00Z`);
    shifted.setUTCDate(shifted.getUTCDate() + nights);
    return { checkIn, checkOut: shifted.toISOString().slice(0, 10), expired };
  }
  return { checkIn, checkOut: isValidDateRangeISO(checkIn, end) ? end : nextDayISO(checkIn), expired };
}

export function readHotelSearchContext(params: URLSearchParams, defaultCheckIn: string) {
  const raw = params.get("checkin") ?? "";
  const checkIn = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : defaultCheckIn;
  const end = params.get("checkout") ?? "";
  const checkOut = isValidDateRangeISO(checkIn, end) ? end : nextDayISO(checkIn);
  const count = (key: string, fallback: number, min: number) => Math.max(min, Math.floor(Number(params.get(key)) || fallback));
  const childAges = (params.get("childAges") ?? "").split(",").filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 17);
  return { checkIn, checkOut, adults: count("adults", Number(params.get("guests")) || 2, 1), rooms: count("rooms", 1, 1), children: childAges.length || count("children", 0, 0), childAges, nationality: /^[A-Z]{2}$/.test(params.get("nationality") ?? "") ? params.get("nationality") ?? "IN" : "IN", currency: /^[A-Z]{3}$/.test(params.get("currency") ?? "") ? params.get("currency") ?? "INR" : "INR" };
}

export function hotelSearchParams(context: { checkIn: string; checkOut: string; adults: number; rooms: number; childAges: number[]; nationality?: string; currency?: string }) {
  return new URLSearchParams({ checkin: context.checkIn, checkout: context.checkOut, adults: String(context.adults), rooms: String(context.rooms), children: String(context.childAges.length), childAges: context.childAges.join(","), nationality: context.nationality ?? "IN", currency: context.currency ?? "INR" });
}