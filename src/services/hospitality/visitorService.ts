import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
export type TimelineEntry = { at: string; label: string; note?: string };
export type Visitor = { id: string; hotel_id: string; visitor_code: string; name: string; phone: string | null; category: string; host_name: string | null; long_stay_id: string | null; area: string | null; purpose: string | null; entry_type: string; status: string; expected_at: string | null; expected_out: string | null; checked_in_at: string | null; checked_out_at: string | null; id_type: string | null; id_verified: boolean; pass_code: string; pass_valid_until: string | null; rating: number | null; notes: string | null; timeline: TimelineEntry[]; created_at: string };
export type Blacklist = { id: string; name: string; phone: string | null; reason: string; active: boolean; created_at: string; removed_reason: string | null };
export type VisitorSettings = { hotel_id: string; visiting_start: string; visiting_end: string; max_per_host: number; max_duration_minutes: number; require_approval: boolean; require_id: boolean; pass_validity_hours: number; restricted_areas: string[]; retention_days: number; pass_note: string | null };
export type Host = { id: string; name: string; unit: string | null };

const ok = (r: { data: any; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };
const entry = (label: string, note?: string): TimelineEntry => ({ at: new Date().toISOString(), label, ...(note ? { note } : {}) });

export async function loadVisitors(hotelId: string, long: boolean) {
  const [v, b, s, h] = await Promise.all([
    db.from("hotel_visitors").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(3000),
    db.from("hotel_visitor_blacklist").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
    db.from("hotel_visitor_settings").select("*").eq("hotel_id", hotelId).maybeSingle(),
    long ? db.from("hotel_long_stays").select("id,resident_name,unit_label").eq("hotel_id", hotelId).eq("status", "active")
         : db.from("hotel_bookings").select("id,guest_name,room_number").eq("hotel_id", hotelId).in("status", ["confirmed", "checked_in"]).gte("check_out", new Date().toISOString().slice(0, 10)),
  ]);
  const hosts: Host[] = (ok(h) ?? []).map((r: any) => ({ id: r.id, name: r.resident_name ?? r.guest_name, unit: r.unit_label ?? r.room_number ?? null })).filter((x: Host) => x.name);
  return { visitors: (ok(v) ?? []) as Visitor[], blacklist: (ok(b) ?? []) as Blacklist[], settings: ok(s) as VisitorSettings | null, hosts };
}

export async function saveSettings(hotelId: string, s: Partial<VisitorSettings>) {
  ok(await db.from("hotel_visitor_settings").upsert({ ...s, hotel_id: hotelId, updated_at: new Date().toISOString() }));
}

export async function createVisitor(hotelId: string, v: Partial<Visitor>, long: boolean, needsApproval: boolean, checkInNow: boolean) {
  const status = checkInNow && !needsApproval ? "inside" : needsApproval ? "pending" : "approved";
  const link = v.long_stay_id ? (long ? { long_stay_id: v.long_stay_id } : { booking_id: v.long_stay_id }) : {};
  const { long_stay_id, ...rest } = v as any;
  return ok(await db.from("hotel_visitors").insert({ ...rest, ...link, hotel_id: hotelId, status, timeline: [entry(v.entry_type === "pre_registered" ? "Pre-registered" : "Walk-in registered"), ...(status === "inside" ? [entry("Checked-In", v.area ?? undefined)] : [])] }).select("*").single()) as Visitor;
}

export async function updateVisitor(v: Visitor, patch: Partial<Visitor>, label: string, note?: string) {
  ok(await db.from("hotel_visitors").update({ ...patch, timeline: [...(v.timeline ?? []), entry(label, note)] }).eq("id", v.id));
}

export async function findByPass(hotelId: string, code: string) {
  const c = code.trim().replace(/^.*[?&]pass=/, "");
  return ok(await db.from("hotel_visitors").select("*").eq("hotel_id", hotelId).or(`pass_code.eq.${c},visitor_code.eq.${c.toUpperCase()}`).maybeSingle()) as Visitor | null;
}

export async function blockVisitor(hotelId: string, name: string, phone: string | null, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  ok(await db.from("hotel_visitor_blacklist").insert({ hotel_id: hotelId, name, phone, reason, added_by: user?.id }));
}
export async function unblock(id: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  ok(await db.from("hotel_visitor_blacklist").update({ active: false, removed_by: user?.id, removed_reason: reason, removed_at: new Date().toISOString() }).eq("id", id));
}
