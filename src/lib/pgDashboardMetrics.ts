// Pure metric helpers for the PG / Hostel owner dashboard (kept testable, no I/O).
export type PgRoom = { id: string; room_type: string; total_units: number | null; max_occupancy: number | null; sell_by?: string | null; accommodation_kind?: string | null; is_active?: boolean | null };
export type PgStay = { id: string; room_id: string | null; status: string; move_in: string; move_out: string | null; occupants?: number | null; created_at: string };
export type PgDue = { amount: number; due_date: string; status: string; period_month: string; paid_at: string | null };

export const LONG_STAY_TYPES = ["pg", "hostel", "co_living", "coliving"];
export const isLongStayProperty = (types: string[] | null | undefined) => (types ?? []).some(t => LONG_STAY_TYPES.includes(t));

/** Beds a room type offers: bed-sold rooms count units, room-sold rooms count units × occupancy. */
export function bedsInRoom(r: PgRoom) {
  const units = Math.max(0, Number(r.total_units) || 0);
  const perBed = r.sell_by === "bed" || ["bed", "dorm"].includes(r.accommodation_kind ?? "");
  return perBed ? units : units * Math.max(1, Number(r.max_occupancy) || 1);
}

const occupiedOn = (s: PgStay, day: string) => ["active", "notice", "confirmed"].includes(s.status) && s.move_in <= day && (!s.move_out || s.move_out > day);

export function pgMetrics(rooms: PgRoom[], stays: PgStay[], dues: PgDue[], maintenanceUnits: number, today: string) {
  const active = rooms.filter(r => r.is_active !== false);
  const totalBeds = active.reduce((s, r) => s + bedsInRoom(r), 0);
  const current = stays.filter(s => occupiedOn(s, today));
  const occupied = Math.min(totalBeds, current.reduce((s, x) => s + Math.max(1, Number(x.occupants) || 1), 0));
  const available = Math.max(0, totalBeds - occupied - maintenanceUnits);
  const month = today.slice(0, 7);
  const monthDues = dues.filter(d => d.period_month.slice(0, 7) === month);
  const collected = monthDues.filter(d => d.status === "paid").reduce((s, d) => s + Number(d.amount), 0);
  const billed = monthDues.reduce((s, d) => s + Number(d.amount), 0);
  const in7 = new Date(new Date(today).getTime() + 7 * 864e5).toISOString().slice(0, 10);
  const weekAgo = new Date(new Date(today).getTime() - 7 * 864e5).toISOString().slice(0, 10);
  const unpaid = dues.filter(d => d.status !== "paid");
  return {
    totalBeds, occupied, available, maintenance: maintenanceUnits,
    occupancyPct: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
    residents: current.length,
    newJoins: stays.filter(s => s.move_in.slice(0, 7) === month && s.move_in <= today).length,
    moveOuts: stays.filter(s => s.move_out && s.move_out.slice(0, 7) === month && s.move_out <= today).length,
    pending: stays.filter(s => ["reserved", "pending", "hold"].includes(s.status)).length,
    collected, due: billed - collected, collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
    upcoming: unpaid.filter(d => d.due_date >= today && d.due_date <= in7).reduce((s, d) => s + Number(d.amount), 0),
    overdue: unpaid.filter(d => d.due_date < weekAgo).reduce((s, d) => s + Number(d.amount), 0),
  };
}

export function occupancyTrend(totalBeds: number, stays: PgStay[], today: string, days = 30) {
  const end = new Date(today).getTime();
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(end - (days - 1 - i) * 864e5).toISOString().slice(0, 10);
    const occ = stays.filter(s => occupiedOn(s, day)).reduce((s, x) => s + Math.max(1, Number(x.occupants) || 1), 0);
    return { day, label: new Date(day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), pct: totalBeds ? Math.min(100, Math.round((occ / totalBeds) * 100)) : 0 };
  });
}
