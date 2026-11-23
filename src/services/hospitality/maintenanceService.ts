import { supabase } from "@/integrations/supabase/client";
import { dueFrom } from "@/config/maintenanceCategories";
const db = supabase as any;
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };

export type TimelineEntry = { at: string; label: string; note?: string };
export type Ticket = { id: string; hotel_id: string; ticket_no: string | null; title: string; room_label: string | null; floor: string | null; category_key: string | null; priority: string; status: string; notes: string | null; requester_name: string | null; requester_type: string | null; assignee_name: string | null; vendor_id: string | null; asset_id: string | null; due_at: string | null; scheduled_for: string | null; is_work_order: boolean; attachments: { path: string; name: string }[]; timeline: TimelineEntry[]; rating: number | null; estimated_cost: number | null; completed_at: string | null; created_at: string };
export type Vendor = { id: string; name: string; phone: string | null; email: string | null; category_keys: string[] };
export type Asset = { id: string; name: string; category_key: string; location: string | null; serial_no: string | null; installed_on: string | null; warranty_until: string | null; status: string; vendor_id: string | null };
export type Schedule = { id: string; title: string; category_key: string; asset_id: string | null; vendor_id: string | null; every_days: number; next_due: string; last_done: string | null };

export async function loadMaintenance(hotelId: string) {
  const [t, v, a, s] = await Promise.all([
    db.from("hotel_ops_tasks").select("*").eq("hotel_id", hotelId).eq("kind", "maintenance").order("created_at", { ascending: false }).limit(1000),
    db.from("hotel_maintenance_vendors").select("*").eq("hotel_id", hotelId).order("name"),
    db.from("hotel_maintenance_assets").select("*").eq("hotel_id", hotelId).order("name"),
    db.from("hotel_preventive_schedules").select("*").eq("hotel_id", hotelId).order("next_due"),
  ]);
  return { tickets: ok(t) as Ticket[], vendors: ok(v) as Vendor[], assets: ok(a) as Asset[], schedules: ok(s) as Schedule[] };
}

const entry = (label: string, note?: string): TimelineEntry => ({ at: new Date().toISOString(), label, ...(note ? { note } : {}) });

export async function raiseTicket(hotelId: string, t: Partial<Ticket>) {
  if (!t.title?.trim()) throw new Error("Describe the issue");
  if (!t.category_key) throw new Error("Choose a category");
  const priority = t.priority || "normal";
  const { data: { user } } = await supabase.auth.getUser();
  const status = t.scheduled_for ? "scheduled" : t.assignee_name || t.vendor_id ? "in_progress" : "open";
  const timeline = [entry(t.is_work_order ? "Work order created" : "Request raised", t.requester_name ? `by ${t.requester_name}` : undefined)];
  if (t.assignee_name) timeline.push(entry(`Assigned to ${t.assignee_name}`));
  const row = ok(await db.from("hotel_ops_tasks").insert({ ...t, hotel_id: hotelId, kind: "maintenance", priority, status, created_by: user?.id, due_at: t.due_at || dueFrom(new Date(), priority).toISOString(), timeline }).select("*").single()) as Ticket;
  if (t.asset_id) await db.from("hotel_maintenance_assets").update({ status: "needs_repair" }).eq("id", t.asset_id);
  return row;
}

export async function updateTicket(t: Ticket, patch: Partial<Ticket>, label: string) {
  const extra: any = {};
  if (patch.status === "done") extra.completed_at = new Date().toISOString();
  ok(await db.from("hotel_ops_tasks").update({ ...patch, ...extra, timeline: [...(t.timeline ?? []), entry(label)], updated_at: new Date().toISOString() }).eq("id", t.id));
  if (patch.status === "done" && t.asset_id) await db.from("hotel_maintenance_assets").update({ status: "working" }).eq("id", t.asset_id);
}

export async function uploadAttachment(t: Ticket, file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error("Files must be under 20 MB");
  const path = `${t.hotel_id}/${t.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const up = await supabase.storage.from("maintenance-attachments").upload(path, file);
  if (up.error) throw new Error(up.error.message);
  await updateTicket(t, { attachments: [...(t.attachments ?? []), { path, name: file.name }] }, `Attachment added: ${file.name}`);
}
export async function attachmentUrl(path: string) {
  const r = await supabase.storage.from("maintenance-attachments").createSignedUrl(path, 600);
  if (r.error) throw new Error(r.error.message); return r.data.signedUrl;
}

export async function saveVendor(hotelId: string, v: Partial<Vendor>) {
  if (!v.name?.trim()) throw new Error("Vendor name is required");
  const { id, ...rest } = v; ok(id ? await db.from("hotel_maintenance_vendors").update(rest).eq("id", id) : await db.from("hotel_maintenance_vendors").insert({ ...rest, hotel_id: hotelId }));
}
export async function saveAsset(hotelId: string, a: Partial<Asset>) {
  if (!a.name?.trim() || !a.category_key) throw new Error("Asset name and category are required");
  const { id, ...rest } = a; ok(id ? await db.from("hotel_maintenance_assets").update(rest).eq("id", id) : await db.from("hotel_maintenance_assets").insert({ ...rest, hotel_id: hotelId }));
}
export async function saveSchedule(hotelId: string, s: Partial<Schedule>) {
  if (!s.title?.trim() || !s.category_key || !s.next_due) throw new Error("Title, category and next date are required");
  const { id, ...rest } = s; ok(id ? await db.from("hotel_preventive_schedules").update(rest).eq("id", id) : await db.from("hotel_preventive_schedules").insert({ ...rest, hotel_id: hotelId }));
}
/** Mark a preventive job done and move it to its next date. */
export async function completeSchedule(s: Schedule) {
  const today = new Date(); const next = new Date(today.getTime() + s.every_days * 864e5);
  ok(await db.from("hotel_preventive_schedules").update({ last_done: today.toISOString().slice(0, 10), next_due: next.toISOString().slice(0, 10) }).eq("id", s.id));
}
