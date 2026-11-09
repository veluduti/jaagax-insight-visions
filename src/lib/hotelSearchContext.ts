import { isValidDateRangeISO, nextDayISO } from "./dateRange";

export function readHotelSearchContext(params: URLSearchParams, defaultCheckIn: string) {
  const raw = params.get("checkin") ?? "";
  const checkIn = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : defaultCheckIn;
  const end = params.get("checkout") ?? "";
  const checkOut = isValidDateRangeISO(checkIn, end) ? end : nextDayISO(checkIn);
  const count = (key: string, fallback: number, min: number) => Math.max(min, Math.floor(Number(params.get(key)) || fallback));
  const childAges = (params.get("childAges") ?? "").split(",").filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 17);
  return { checkIn, checkOut, adults: count("adults", Number(params.get("guests")) || 2, 1), rooms: count("rooms", 1, 1), children: childAges.length || count("children", 0, 0), childAges };
}

export function hotelSearchParams(context: { checkIn: string; checkOut: string; adults: number; rooms: number; childAges: number[] }) {
  return new URLSearchParams({ checkin: context.checkIn, checkout: context.checkOut, adults: String(context.adults), rooms: String(context.rooms), children: String(context.childAges.length), childAges: context.childAges.join(",") });
}