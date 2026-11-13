// Pure supplier rules shared by browser, edge connector and tests.
export type SupplierPax = { adults: number; childAges?: number[]; children?: number[] };
export const supplierGuests = (rooms: SupplierPax[]) => rooms.map(r => `${r.adults}${(r.childAges ?? r.children ?? []).length ? `-${(r.childAges ?? r.children ?? []).join(",")}` : ""}`).join(".");
export const paxSignature = (r: SupplierPax) => `${r.adults}|${[...(r.childAges ?? r.children ?? [])].sort((a, b) => a - b).join(",")}`;
export const publicRate = (r: any) => !r.ratePlanInfo?.isPrivate && !r.ratePlanInfo?.isPackageRate;
export function customerPrice(rate: any, currency: string) {
  const read = (p: any) => Number.isFinite(p?.searchCurrency) && p.searchCurrency > 0 ? Number(p.searchCurrency) : p?.currency === currency && Number(p.price) > 0 ? Number(p.price) : null;
  const sell = read(rate.prices?.sell), bar = read(rate.prices?.bar);
  if (rate.prices?.bar?.price > 0 && bar == null) return null;
  return sell == null && bar == null ? null : { amount: Math.max(sell ?? 0, bar ?? 0), currency };
}
export function bookingContent(data: any) { return data?.content ?? data; }
export function payAtHotelSupported(disclosure: any) { return disclosure?.payment?.charge === "customer"; }
export function matchingQuotedGuests(actual: any[], expected: SupplierPax) {
  if (actual.length !== expected.adults + (expected.children ?? expected.childAges ?? []).length) return false;
  const ages = actual.map(g => Number(g.age));
  if (ages.some(age => !Number.isFinite(age) || age < 0)) return false;
  return ages.filter(age => age >= 18).length === expected.adults && ages.filter(age => age < 18).sort((a,b) => a-b).join(",") === [...(expected.children ?? expected.childAges ?? [])].sort((a,b) => a-b).join(",");
}
export function bookingList(data: any): any[] { return Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : data?.content?.bookings ?? data?.bookings ?? []; }
export function bookingStatus(b: any): string {
  const top = String(b?.status ?? "pending").toLowerCase();
  const rooms = (b?.rooms ?? []).map((r: any) => String(r.status ?? top).toLowerCase());
  if (!rooms.length || rooms.every((s: string) => s === top)) return top;
  if (rooms.every((s: string) => s === "cancelled")) return "cancelled";
  if (rooms.every((s: string) => s === "confirmed") && top === "confirmed") return "confirmed";
  if (rooms.some((s: string) => s === "confirmed") && rooms.some((s: string) => ["rejected", "failed", "cancelled"].includes(s))) return "partial";
  if (rooms.some((s: string) => ["pending", "unknown"].includes(s))) return "pending";
  return top === "confirmed" ? "partial" : top;
}
export function redactSupplier(value: any): any {
  if (Array.isArray(value)) return value.map(redactSupplier);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /^(number|cardNumber|pan|cvv|cvc|securityCode|authorization|access_token|token)$/i.test(k) ? "[redacted]" : redactSupplier(v)]));
}
export function hotelLocalInstant(text: string, timezone?: string): number | null {
  if (!text) return null;
  const normalized = text.replace(" ", "T");
  if (/(Z|[+-]\d\d:\d\d)$/i.test(normalized)) { const n = Date.parse(normalized); return Number.isFinite(n) ? n : null; }
  if (!timezone) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(normalized);
  if (!match) return null;
  const wall = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +(match[6] ?? 0));
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    let instant = wall;
    for (let i = 0; i < 4; i++) {
      const parts = Object.fromEntries(fmt.formatToParts(instant).map(p => [p.type, p.value]));
      const actual = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
      const adjustment = wall - actual;
      if (!adjustment) return instant;
      instant += adjustment;
    }
    return null;
  } catch { return null; }
}
export function policyDeadline(policy: any, checkIn: string, timezone?: string, checkInTime = "00:00") {
  const pivot = hotelLocalInstant(`${checkIn}T${policy.cancellationDeadlineHour ?? checkInTime}`, timezone);
  if (pivot == null) return null;
  const setting = policy.timeSetting ?? policy;
  const amount = Number(setting.timeFromCheckIn ?? policy.daysBefore);
  if (!Number.isFinite(amount)) return null;
  if (setting.timeFromCheckInType === "hours") return pivot - amount * 3600000;
  const date = new Date(`${checkIn}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - amount);
  return hotelLocalInstant(`${date.toISOString().slice(0, 10)}T${policy.cancellationDeadlineHour ?? checkInTime}`, timezone);
}
export function supplierDisclosures(rate: any) {
  return { taxes: rate.prices?.sell?.taxes ?? [], fees: rate.prices?.fees ?? rate.prices?.sell?.fees ?? [], remarks: rate.remarks ?? [], cancellationPolicies: rate.cancellationPolicies ?? [], payment: { charge: rate.payment?.charge, chargeType: rate.payment?.chargeType }, immediate: rate.isImmediate !== false };
}
// Rates and repeated occupancy groups must share stock by physical room identity.
export function allocateSupplierRooms(property: any, requests: SupplierPax[], currency: string) {
  const stock = new Map<string, number>();
  const choices = requests.map(req => (property.rooms ?? []).filter((r: any) => paxSignature(r.searchedPax ?? { adults: 0 }) === paxSignature(req)).flatMap((room: any) => {
    const id = String(room.roomId ?? room.roomTypeCode);
    const count = Math.max(0, Number(room.numberOfAvailableRooms) || 0);
    stock.set(id, Math.min(stock.get(id) ?? count, count));
    return (room.ratePlans ?? []).filter(publicRate).map((rate: any) => ({ id, roomName: room.roomName ?? null, rate, price: customerPrice(rate, currency) })).filter((c: any) => c.price);
  }));
  if (!requests.length || choices.some(c => !c.length)) return null;
  let best = Infinity;
  let bestChoices: any[] = [];
  const selected: any[] = [];
  function visit(i: number, sum: number) {
    if (sum >= best) return;
    if (i === choices.length) { best = sum; bestChoices = [...selected]; return; }
    for (const choice of choices[i]) {
      const available = stock.get(choice.id) ?? 0;
      if (available < 1) continue;
      stock.set(choice.id, available - 1); selected.push(choice); visit(i + 1, sum + choice.price.amount); selected.pop(); stock.set(choice.id, available);
    }
  }
  visit(0, 0);
  return Number.isFinite(best) ? { amount: best, currency, selections: bestChoices } : null;
}