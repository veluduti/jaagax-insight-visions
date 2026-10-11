import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface StayItem {
  hotel_id: string; room_id: string; check_in: string; check_out: string;
  num_rooms: number; adults: number; children: number; meal_plan?: string;
}
export interface Stop { destination: string; arrival: string; departure: string; notes?: string; stays: StayItem[] }

export interface SmartStay {
  id: string; public_ref: string; creator_id: string; creator_role: string; title: string; description: string | null;
  images: string[]; inclusions: string[]; cancellation_policy: string | null; currency: string; markup: number;
  valid_from: string | null; valid_to: string | null; itinerary: Stop[]; status: string; current_revision: number;
  published_revision_id: string | null; created_at: string;
}

export const statusText: Record<string, string> = {
  draft: "Draft", pending_approval: "Waiting for hotels", changes_requested: "Changes requested", rejected: "Rejected by a hotel",
  ready: "Approved — ready to publish", published: "Live", archived: "Archived",
  PENDING_PAYMENT: "Awaiting payment", PAYMENT_PROCESSING: "Payment in progress", PAYMENT_SUCCEEDED: "Paid",
  CONFIRMING_HOTELS: "Confirming hotels", CONFIRMED: "Confirmed", MANUAL_REVIEW: "Under review by our team",
  PENDING: "Pending", FAILED: "Could not confirm",
};

export const errMsg = (e: any) => e?.message?.replace(/^.*?ERROR:\s*/, "") || "Something went wrong";
export const inr = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ----- Creator -----
export async function listMyPackages(uid: string) {
  const { data, error } = await db.from("smart_stays").select("*").eq("creator_id", uid).eq("is_hidden", false).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SmartStay[];
}
export async function savePackage(p: Partial<SmartStay> & { id?: string }) {
  const fields = { title: p.title, description: p.description, images: p.images, inclusions: p.inclusions,
    cancellation_policy: p.cancellation_policy, markup: p.markup, valid_from: p.valid_from || null, valid_to: p.valid_to || null, itinerary: p.itinerary };
  if (p.id) {
    const { error } = await db.from("smart_stays").update(fields).eq("id", p.id);
    if (error) throw error;
    return p.id;
  }
  const { data, error } = await db.from("smart_stays").insert(fields).select("id").single();
  if (error) throw error;
  return data.id as string;
}
export const previewPrice = async (itinerary: Stop[], from?: string | null, to?: string | null) => {
  const { data, error } = await db.rpc("smart_stay_price", { _itinerary: itinerary, _valid_from: from || null, _valid_to: to || null });
  if (error) throw error;
  return data as { stays: any[]; hotel_cost: number; taxes: number };
};
export const submitPackage = async (id: string) => { const { data, error } = await db.rpc("smart_stay_submit", { _id: id }); if (error) throw error; return data; };
export const publishPackage = async (id: string) => { const { error } = await db.rpc("smart_stay_publish", { _id: id }); if (error) throw error; };
export const unpublishPackage = async (id: string) => { const { error } = await db.rpc("smart_stay_unpublish", { _id: id }); if (error) throw error; };
export const deletePackage = async (id: string) => { const { error } = await db.from("smart_stays").delete().eq("id", id); if (error) throw error; };

export async function getApprovalsForRevision(stayId: string, revision: number) {
  const { data: rev } = await db.from("smart_stay_revisions").select("id").eq("smart_stay_id", stayId).eq("revision", revision).maybeSingle();
  if (!rev) return [];
  const { data } = await db.from("smart_stay_approvals").select("*, hotel:partner_hotels(name)").eq("revision_id", rev.id);
  return data ?? [];
}

/** Live hotels + their active rooms, for the builder pickers. */
export async function listHotelsForBuilder(search: string) {
  let q = db.from("partner_hotels").select("id, name, city, locality, gst_rate").eq("is_active", true).order("name").limit(40);
  if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
  const { data } = await q;
  return data ?? [];
}
export async function listRooms(hotelId: string) {
  const { data } = await db.from("hotel_rooms").select("id, room_name, room_type, base_price, max_occupancy, max_adults").eq("hotel_id", hotelId).eq("is_active", true);
  return data ?? [];
}

// ----- Hotel approvals -----
export async function listMyApprovalRequests(hotelIds: string[]) {
  if (!hotelIds.length) return [];
  const { data, error } = await db.from("smart_stay_approvals")
    .select("*, hotel:partner_hotels(name), stay:smart_stays(title, public_ref, current_revision, creator_role), revision:smart_stay_revisions(revision)")
    .in("hotel_id", hotelIds).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}
export const decideApproval = async (id: string, decision: "approved" | "rejected" | "changes_requested", reason = "") => {
  const { error } = await db.rpc("smart_stay_decide", { _approval_id: id, _decision: decision, _reason: reason });
  if (error) throw error;
};
export async function listHotelReservations(hotelIds: string[]) {
  if (!hotelIds.length) return [];
  const { data } = await db.from("smart_stay_reservations").select("*, booking:smart_stay_bookings(booking_ref, guest_name, guest_phone, status)")
    .in("hotel_id", hotelIds).order("check_in").limit(100);
  return data ?? [];
}

// ----- Customer -----
export async function listPublished() {
  const { data, error } = await db.from("smart_stays").select("*").not("published_revision_id", "is", null).neq("status", "archived")
    .order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return attachRevisions(data ?? []);
}
async function attachRevisions(rows: any[]) {
  const ids = rows.map((r) => r.published_revision_id).filter(Boolean);
  if (!ids.length) return rows;
  const { data } = await db.from("smart_stay_revisions").select("id, snapshot, selling_price").in("id", ids);
  const m = new Map((data ?? []).map((r: any) => [r.id, r]));
  return rows.map((r) => ({ ...r, revision: m.get(r.published_revision_id) }));
}
export async function getPublished(id: string) {
  const { data } = await db.from("smart_stays").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return (await attachRevisions([data]))[0];
}
export async function getQuote(stayId: string) {
  const { data: qid, error } = await db.rpc("smart_stay_quote", { _id: stayId });
  if (error) throw error;
  const { data } = await db.from("smart_stay_quotes").select("*").eq("id", qid).single();
  return data;
}
export async function createBooking(quoteId: string, guest: { name: string; phone: string; email?: string }) {
  const { data, error } = await db.rpc("smart_stay_book", { _quote_id: quoteId, _name: guest.name, _phone: guest.phone, _email: guest.email || "" });
  if (error) throw error;
  return data as string;
}
export async function listMyBookings(uid: string) {
  const { data, error } = await db.from("smart_stay_bookings").select("*, reservations:smart_stay_reservations(*), events:smart_stay_events(event, created_at)")
    .eq("customer_id", uid).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

let rzp: Promise<void> | null = null;
const loadRazorpay = () => {
  if ((window as any).Razorpay) return Promise.resolve();
  rzp ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(); s.onerror = () => { rzp = null; rej(new Error("Could not load payment window")); };
    document.body.appendChild(s);
  });
  return rzp;
};

export async function payForBooking(bookingId: string, prefill: { name?: string; email?: string; contact?: string }, title: string) {
  await loadRazorpay();
  const { data: order, error } = await supabase.functions.invoke("smart-stay-pay", { body: { action: "create", booking_id: bookingId } });
  if (error || order?.error) throw new Error(order?.error || "Could not start payment");
  if (order?.already) return;
  await new Promise<void>((resolve, reject) => {
    const r = new (window as any).Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: "JAAGA X Smart Stays", description: title, prefill, theme: { color: "#10b981" },
      handler: async (resp: any) => {
        const { data, error: e } = await supabase.functions.invoke("smart-stay-pay", { body: { action: "verify", booking_id: bookingId, ...resp } });
        if (e || !data?.success) reject(new Error(data?.error || "Payment could not be verified")); else resolve();
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    r.on("payment.failed", (x: any) => reject(new Error(x?.error?.description || "Payment failed")));
    r.open();
  });
}

/** Pure helper used by the builder for instant feedback (server re-validates everything). */
export function validateItinerary(stops: Stop[]): string | null {
  if (!stops.length) return "Add at least one destination";
  let prev = "";
  for (const [i, s] of stops.entries()) {
    const n = i + 1;
    if (!s.destination.trim()) return `Stop ${n}: destination is required`;
    if (!s.arrival || !s.departure || s.departure <= s.arrival) return `Stop ${n}: departure must be after arrival`;
    if (prev && s.arrival < prev) return `Stop ${n} starts before the previous stop ends`;
    prev = s.departure;
    if (!s.stays.length) return `Stop ${n}: add a hotel stay`;
    for (const st of s.stays) {
      if (!st.hotel_id || !st.room_id) return `Stop ${n}: choose hotel and room`;
      if (!st.check_in || !st.check_out || st.check_out <= st.check_in) return `Stop ${n}: check-out must be after check-in`;
      if (st.check_in < s.arrival || st.check_out > s.departure) return `Stop ${n}: hotel dates must be within the stop dates`;
    }
  }
  return null;
}
