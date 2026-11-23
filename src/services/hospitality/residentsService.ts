// Residents, Guests & Leads. Reads existing long stays, bookings, invoices, waitlist and
// maintenance records; only leads live in their own table (hotel_leads).
import { supabase } from "@/integrations/supabase/client";
import { bucketOf } from "@/config/residentModes";
const db = supabase as any;
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };
const entry = (label: string, note?: string) => ({ at: new Date().toISOString(), label, ...(note ? { note } : {}) });
export const todayISO = () => new Date().toISOString().slice(0, 10);

export type PersonRow = {
  id: string; kind: "stay" | "booking"; name: string; phone: string | null; email: string | null;
  unit: string; roomId: string | null; stayType: string; amount: number; deposit: number; start: string; end: string | null;
  status: string; bucket: ReturnType<typeof bucketOf>; nextDue: string | null; payStatus: "paid" | "due" | "overdue" | "none";
  outstanding: number; paid: number; ref: string | null; raw: any;
};
export type Lead = { id: string; hotel_id: string; name: string; phone: string | null; email: string | null; source: string; stage: string; interest: string | null; budget: number | null; preferred_move_in: string | null; assignee_name: string | null; follow_up_at: string | null; visit_at: string | null; notes: string | null; timeline: { at: string; label: string; note?: string }[]; converted_stay_id: string | null; created_at: string };

export async function loadResidents(hotelId: string, sources: ("stays" | "bookings")[]) {
  const t = todayISO();
  const [rooms, units, stays, bookings, invoices, waitlist, leads, tickets] = await Promise.all([
    db.from("hotel_rooms").select("id,room_name,room_type,total_units,number_of_beds,max_occupancy,accommodation_kind").eq("hotel_id", hotelId),
    db.from("hotel_inventory_units").select("id,room_id,label,unit_kind,status").eq("hotel_id", hotelId),
    sources.includes("stays") ? db.from("hotel_long_stays").select("*").eq("hotel_id", hotelId).order("move_in", { ascending: false }).limit(2000) : { data: [], error: null },
    sources.includes("bookings") ? db.from("hotel_bookings").select("id,guest_name,guest_phone,guest_email,room_type,room_number,room_id,check_in,check_out,total_amount,amount_paid,status,booking_reference,num_rooms,created_at").eq("hotel_id", hotelId).order("check_in", { ascending: false }).limit(2000) : { data: [], error: null },
    db.from("hotel_invoices").select("id,invoice_no,long_stay_id,booking_id,total,paid_amount,due_date,status,period_start,period_end,created_at").eq("hotel_id", hotelId).neq("status", "void").limit(5000),
    db.from("hotel_waitlist").select("id,room_id,check_in,check_out,guests,status,created_at").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(500),
    db.from("hotel_leads").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(2000),
    db.from("hotel_ops_tasks").select("id,title,status,room_label,requester_name,created_at").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(300),
  ]);
  const roomList = ok(rooms) as any[]; const inv = ok(invoices) as any[];
  const roomName = (id: string | null) => roomList.find(r => r.id === id)?.room_name ?? roomList.find(r => r.id === id)?.room_type ?? "";
  const money = (link: "long_stay_id" | "booking_id", id: string) => {
    const mine = inv.filter(i => i[link] === id);
    const open = mine.filter(i => Number(i.total) - Number(i.paid_amount ?? 0) > 0.009).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const outstanding = open.reduce((s, i) => s + Number(i.total) - Number(i.paid_amount ?? 0), 0);
    const paid = mine.reduce((s, i) => s + Number(i.paid_amount ?? 0), 0);
    const nextDue = open[0]?.due_date ?? null;
    return { invoices: mine, outstanding, paid, nextDue, payStatus: (!mine.length ? "none" : !open.length ? "paid" : nextDue! < t ? "overdue" : "due") as PersonRow["payStatus"] };
  };
  const people: PersonRow[] = [
    ...(ok(stays) as any[]).map(s => { const m = money("long_stay_id", s.id); return {
      id: s.id, kind: "stay" as const, name: s.resident_name, phone: s.resident_phone, email: s.resident_email,
      unit: [roomName(s.room_id), s.unit_label].filter(Boolean).join(" / ") || "Unassigned", roomId: s.room_id,
      stayType: `${roomName(s.room_id) || "Long stay"}${s.occupants > 1 ? ` (${s.occupants} sharing)` : ""}`,
      amount: Number(s.monthly_rent) || 0, deposit: Number(s.deposit) || 0, start: s.move_in, end: s.move_out, status: s.status,
      bucket: bucketOf({ kind: "stay", status: s.status, start: s.move_in, end: s.status === "moved_out" ? s.move_out : null }, t),
      ...m, ref: s.booking_ref, raw: { ...s, invoices: m.invoices } }; }),
    ...(ok(bookings) as any[]).map(b => { const m = money("booking_id", b.id); const paid = Math.max(m.paid, Number(b.amount_paid ?? 0)); const out = m.invoices.length ? m.outstanding : Math.max(0, Number(b.total_amount ?? 0) - Number(b.amount_paid ?? 0)); return {
      id: b.id, kind: "booking" as const, name: b.guest_name || "Guest", phone: b.guest_phone, email: b.guest_email,
      unit: [b.room_type || roomName(b.room_id), b.room_number].filter(Boolean).join(" / ") || "Unassigned", roomId: b.room_id,
      stayType: b.room_type || "Nightly stay", amount: Number(b.total_amount) || 0, deposit: 0, start: b.check_in, end: b.check_out, status: b.status,
      bucket: bucketOf({ kind: "booking", status: b.status === "checked_in" ? "active" : b.status, start: b.check_in, end: b.status === "checked_in" ? null : b.check_out }, t),
      invoices: m.invoices, outstanding: out, paid, nextDue: m.nextDue ?? (out > 0 ? b.check_in : null), payStatus: (out > 0 ? (b.check_in < t ? "overdue" : "due") : paid > 0 ? "paid" : "none") as PersonRow["payStatus"],
      ref: b.booking_reference, raw: { ...b, invoices: m.invoices } }; }),
  ];
  const unitRows = ok(units) as any[];
  const capacity = unitRows.length || roomList.reduce((s, r) => s + (Number(r.total_units) || 0) * (sources.includes("stays") ? Math.max(1, Number(r.number_of_beds) || 1) : 1), 0);
  return { rooms: roomList, units: unitRows, people, invoices: inv, capacity, waitlist: ok(waitlist) as any[], leads: ok(leads) as Lead[], tickets: ok(tickets) as any[] };
}

export async function saveLead(hotelId: string, l: Partial<Lead>) {
  if (!l.name?.trim()) throw new Error("Enter the lead's name");
  if (!l.phone?.trim() && !l.email?.trim()) throw new Error("Add a phone number or email");
  if (l.phone && !/^\+?[\d\s-]{7,15}$/.test(l.phone)) throw new Error("Enter a valid phone number");
  const { data: { user } } = await supabase.auth.getUser();
  const { id, timeline, ...rest } = l as any;
  if (id) return ok(await db.from("hotel_leads").update({ ...rest, timeline: [...(timeline ?? []), entry("Lead updated")] }).eq("id", id));
  return ok(await db.from("hotel_leads").insert({ ...rest, hotel_id: hotelId, created_by: user?.id, timeline: [entry("Lead created")] }));
}
export async function moveLead(l: Lead, stage: string, label: string) {
  if (l.stage === stage) return;
  ok(await db.from("hotel_leads").update({ stage, timeline: [...(l.timeline ?? []), entry(`Moved to ${label}`)] }).eq("id", l.id));
}
export async function deleteLead(id: string) { ok(await db.from("hotel_leads").delete().eq("id", id)); }

export async function addStay(hotelId: string, s: any) {
  if (!s.resident_name?.trim()) throw new Error("Enter the name");
  if (!s.move_in) throw new Error("Choose a move-in date");
  if (!(Number(s.monthly_rent) > 0)) throw new Error("Enter the monthly rent");
  const { data: { user } } = await supabase.auth.getUser();
  return ok(await db.from("hotel_long_stays").insert({ ...s, hotel_id: hotelId, status: "active", created_by: user?.id, timeline: [entry("Moved in")] }).select("id").single()) as { id: string };
}
export async function updateStay(row: PersonRow, patch: any, label: string, note?: string) {
  ok(await db.from("hotel_long_stays").update({ ...patch, timeline: [...(row.raw.timeline ?? []), entry(label, note)] }).eq("id", row.id));
}
export async function setBookingStatus(row: PersonRow, status: string) {
  ok(await db.from("hotel_bookings").update({ status }).eq("id", row.id));
}
export async function convertLead(l: Lead, stayId: string | null) {
  ok(await db.from("hotel_leads").update({ stage: "converted", converted_stay_id: stayId, timeline: [...(l.timeline ?? []), entry("Converted")] }).eq("id", l.id));
}
