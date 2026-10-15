import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LongStayMetrics = {
  rooms: number; capacity: number; occupied: number; available: number; occupancyPct: number;
  residents: number; onNotice: number; upcomingMoveIns: number; upcomingMoveOuts: number;
  rentDue: number; rentDueAmount: number; overdue: number; overdueAmount: number;
  pendingPayments: number; revenueThisMonth: number; deposits: number; advances: number;
  maintenanceBlocks: number; renewalsSoon: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Real long-stay figures for one property — every number comes from saved records. */
export async function loadLongStayMetrics(hotelId: string): Promise<LongStayMetrics> {
  const today = iso(new Date());
  const in30 = iso(new Date(Date.now() + 30 * 864e5));
  const monthStart = today.slice(0, 8) + "01";
  const [rooms, stays, dues, units] = await Promise.all([
    sb.from("hotel_rooms").select("id,total_units").eq("hotel_id", hotelId),
    sb.from("hotel_long_stays").select("status,move_in,move_out,deposit,advance,payment_status,occupants").eq("hotel_id", hotelId).neq("status", "expired").limit(1000),
    sb.from("hotel_rent_dues").select("amount,due_date,status,paid_at").eq("hotel_id", hotelId).limit(2000),
    sb.from("hotel_inventory_units").select("status,room_id").eq("status", "maintenance").limit(1000),
  ]);
  const roomRows = rooms.data ?? [];
  const roomIds = new Set(roomRows.map((r: any) => r.id));
  const capacity = roomRows.reduce((s: number, r: any) => s + Math.max(0, Number(r.total_units) || 0), 0);
  const st = (stays.data ?? []) as any[];
  const current = st.filter((s) => (s.status === "active" || s.status === "notice" || s.status === "confirmed") && s.move_in <= today && (!s.move_out || s.move_out >= today));
  const occupied = current.length;
  const ds = (dues.data ?? []) as any[];
  const due = ds.filter((d) => d.status === "due" && d.due_date >= today);
  const over = ds.filter((d) => d.status === "due" && d.due_date < today);
  const sum = (a: any[], k: string) => Math.round(a.reduce((s, x) => s + (Number(x[k]) || 0), 0));
  const live = st.filter((s) => s.status !== "moved_out" && s.status !== "cancelled");
  return {
    rooms: roomRows.length, capacity, occupied, available: Math.max(0, capacity - occupied),
    occupancyPct: capacity ? Math.round((occupied / capacity) * 100) : 0,
    residents: occupied, onNotice: st.filter((s) => s.status === "notice").length,
    upcomingMoveIns: st.filter((s) => s.status !== "cancelled" && s.move_in > today && s.move_in <= in30).length,
    upcomingMoveOuts: live.filter((s) => s.move_out && s.move_out >= today && s.move_out <= in30).length,
    rentDue: due.length, rentDueAmount: sum(due, "amount"), overdue: over.length, overdueAmount: sum(over, "amount"),
    pendingPayments: due.length + over.length + st.filter((s) => s.payment_status === "pending" && s.status === "held").length,
    revenueThisMonth: sum(ds.filter((d) => d.status === "paid" && (d.paid_at || "") >= monthStart), "amount"),
    deposits: sum(live, "deposit"), advances: sum(live, "advance"),
    maintenanceBlocks: (units.data ?? []).filter((u: any) => roomIds.has(u.room_id)).length,
    renewalsSoon: live.filter((s) => s.move_out && s.move_out >= today && s.move_out <= in30 && s.status !== "notice").length,
  };
}
