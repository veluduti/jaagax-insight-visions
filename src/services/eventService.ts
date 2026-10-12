// Events module data access. Reads go straight to the database (RLS-protected);
// bookings, payments, reviews and broadcasts go through the `events-api` function.
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { loadRazorpayScript, razorpayCheckoutConfig } from "@/lib/hotelPay";

const db = supabase as any;

export type TicketKind = "free" | "paid" | "vip";
export type EventStatus = "draft" | "pending_approval" | "approved" | "rejected" | "cancelled" | "completed";

export interface TicketType {
  id: string; event_id: string; kind: TicketKind; name: string; price: number; quantity: number; sold: number;
  sales_start: string | null; sales_end: string | null; benefits: string[]; requires_payment: boolean; max_per_booking: number;
}
export interface EventRow {
  id: string; organizer_id: string; organizer_name: string | null; title: string; description: string | null;
  event_type: string; event_date: string; start_time: string; end_time: string | null; venue: string;
  address: string | null; city: string | null; latitude: number | null; longitude: number | null;
  image_urls: string[]; property_ids: string[]; status: EventStatus; rejection_reason: string | null;
  submitted_at: string | null; reviewed_at: string | null; created_at: string;
  tickets?: TicketType[];
}
export interface EventBooking {
  id: string; event_id: string; ticket_type_id: string; customer_id: string; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null; quantity: number; unit_price: number; total_amount: number;
  status: "pending_payment" | "confirmed" | "failed" | "cancelled";
  payment_status: "not_required" | "pending" | "paid" | "failed" | "refund_pending" | "refunded";
  booking_reference: string; razorpay_payment_id: string | null; paid_at: string | null; confirmed_at: string | null;
  checked_in_count: number; checked_in_at: string | null; cancelled_at: string | null; cancel_reason: string | null; created_at: string;
  event?: EventRow; ticket?: TicketType;
}

export const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "property_launch", label: "Property launch" },
  { value: "open_house", label: "Open house" },
  { value: "site_visit", label: "Group site visit" },
  { value: "expo", label: "Property expo" },
  { value: "seminar", label: "Seminar / workshop" },
  { value: "community", label: "Community meetup" },
  { value: "festival", label: "Festival / celebration" },
  { value: "other", label: "Other" },
];
export const eventTypeLabel = (v: string) => EVENT_TYPES.find((t) => t.value === v)?.label ?? v;
export const KIND_LABEL: Record<TicketKind, string> = { free: "Free", paid: "Paid", vip: "VIP" };
export const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export const hhmm = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m || 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};
export const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const seatsLeft = (t: TicketType) => Math.max(0, t.quantity - t.sold);
export const ticketOnSale = (t: TicketType) => {
  const now = Date.now();
  if (t.sales_start && now < new Date(t.sales_start).getTime()) return "not_started";
  if (t.sales_end && now > new Date(t.sales_end).getTime()) return "ended";
  if (seatsLeft(t) <= 0) return "sold_out";
  return "on_sale";
};
export const eventEnded = (e: EventRow) =>
  new Date(`${e.event_date}T${(e.end_time || e.start_time).slice(0, 5)}:00+05:30`).getTime() < Date.now();

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("events-api", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { const j = await error.context.json(); msg = j?.error || msg; } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

const SELECT_EVENT = "*, tickets:event_ticket_types(*)";

export async function listPublicEvents(): Promise<EventRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from("events").select(SELECT_EVENT).eq("status", "approved").gte("event_date", today).order("event_date");
  if (error) throw error;
  return data || [];
}
export async function getEvent(id: string): Promise<EventRow | null> {
  const { data, error } = await db.from("events").select(SELECT_EVENT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (data?.tickets) data.tickets.sort((a: TicketType, b: TicketType) => a.price - b.price);
  return data;
}
export async function listMyEvents(uid: string): Promise<EventRow[]> {
  const { data, error } = await db.from("events").select(SELECT_EVENT).eq("organizer_id", uid).order("event_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function listEventsForReview(status: EventStatus | "all"): Promise<EventRow[]> {
  let q = db.from("events").select(SELECT_EVENT).order("submitted_at", { ascending: true });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
export async function canOrganize(uid: string): Promise<boolean> {
  const { data } = await db.rpc("can_organize_events", { _uid: uid });
  return !!data;
}
export async function getLinkedProperties(ids: string[]) {
  if (!ids?.length) return [];
  const { data } = await db.from("properties").select("id, slug, title, city, locality, price, images").in("id", ids);
  return data || [];
}
export async function searchProperties(term: string) {
  const { data } = await db.from("properties").select("id, title, city, locality")
    .ilike("title", `%${term.replace(/[%_,()]/g, " ")}%`).not("title", "is", null).limit(10);
  return data || [];
}

export interface TicketInput {
  id?: string; kind: TicketKind; name: string; price: number; quantity: number;
  sales_start: string | null; sales_end: string | null; benefits: string[]; requires_payment: boolean; max_per_booking: number;
}
export interface EventInput {
  organizer_name: string; title: string; description: string; event_type: string; event_date: string; start_time: string;
  end_time: string | null; venue: string; address: string; city: string; latitude: number | null; longitude: number | null;
  image_urls: string[]; property_ids: string[];
}

export async function saveEvent(uid: string, input: EventInput, tickets: TicketInput[], submit: boolean, existingId?: string) {
  let id = existingId;
  const status: EventStatus = submit ? "pending_approval" : "draft";
  if (id) {
    const { error } = await db.from("events").update({ ...input, status }).eq("id", id);
    if (error) throw error;
    const { data: old } = await db.from("event_ticket_types").select("id").eq("event_id", id);
    const keep = new Set(tickets.filter((t) => t.id).map((t) => t.id));
    const del = (old || []).map((o: any) => o.id).filter((x: string) => !keep.has(x));
    if (del.length) { const { error: de } = await db.from("event_ticket_types").delete().in("id", del); if (de) throw de; }
  } else {
    const { data, error } = await db.from("events").insert({ ...input, organizer_id: uid, status }).select("id").single();
    if (error) throw error;
    id = data.id;
  }
  for (const t of tickets) {
    const { id: tid, ...row } = t;
    const q = tid ? db.from("event_ticket_types").update(row).eq("id", tid) : db.from("event_ticket_types").insert({ ...row, event_id: id });
    const { error } = await q;
    if (error) throw error;
  }
  if (submit) await call({ action: "submitted", event_id: id }).catch(() => undefined);
  return id!;
}

export async function deleteEvent(id: string) {
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadEventImage(uid: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `events/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("property-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
}

export const reviewEvent = (event_id: string, approve: boolean, reason?: string) => call({ action: "review", event_id, approve, reason });
export const cancelEvent = (event_id: string, reason: string) => call({ action: "cancel_event", event_id, reason });
export const notifyAttendees = (event_id: string, message: string, audience: "all" | "attended") =>
  call<{ sent: number }>({ action: "notify_attendees", event_id, message, audience });
export const cancelBooking = (booking_id: string, reason?: string) => call({ action: "cancel_booking", booking_id, reason });

export async function listEventBookings(eventId: string): Promise<EventBooking[]> {
  const { data, error } = await db.from("event_bookings").select("*, ticket:event_ticket_types(*)").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function listMyBookings(uid: string): Promise<EventBooking[]> {
  const { data, error } = await db.from("event_bookings").select("*, event:events(*), ticket:event_ticket_types(*)")
    .eq("customer_id", uid).neq("status", "failed").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function getBooking(id: string): Promise<EventBooking | null> {
  const { data, error } = await db.from("event_bookings").select("*, event:events(*), ticket:event_ticket_types(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function checkIn(bookingId: string, count: number) {
  const { error } = await db.rpc("event_check_in", { _booking_id: bookingId, _count: count });
  if (error) throw error;
}

/** Reserve seats; for paid tickets opens Razorpay and resolves after server-side verification. */
export async function bookTickets(opts: {
  ticketId: string; quantity: number; name?: string; phone?: string; email?: string;
}): Promise<EventBooking> {
  const res = await call<{ booking: EventBooking; needs_payment: boolean }>({
    action: "book", ticket_type_id: opts.ticketId, quantity: opts.quantity, name: opts.name, phone: opts.phone,
  });
  if (!res.needs_payment) return res.booking;
  return payForBooking(res.booking.id, opts);
}

export async function payForBooking(bookingId: string, prefill: { name?: string; phone?: string; email?: string } = {}): Promise<EventBooking> {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection.");
  const order = await call<{ order_id: string; amount: number; currency: string; key_id: string; title?: string }>({ action: "pay_create", booking_id: bookingId });
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: "JAAGA X Events", description: order.title || "Event tickets",
      prefill: { name: prefill.name, email: prefill.email, contact: prefill.phone },
      theme: { color: "#10b981" }, ...razorpayCheckoutConfig,
      handler: async (r: any) => {
        try {
          const v = await call<{ booking: EventBooking }>({ action: "pay_verify", booking_id: bookingId, ...r });
          resolve(v.booking);
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled. Your seats are held for 15 minutes — you can retry from My Event Bookings.")) },
    });
    rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed")));
    rzp.open();
  });
}
