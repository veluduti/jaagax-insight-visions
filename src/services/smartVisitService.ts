import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type PlanStatus = "pending_state_review" | "pending_review" | "approved" | "rejected" | "completed" | "cancelled";
export type PickupType = "meeting_point" | "home";

export interface SmartVisitPlan {
  id: string;
  agent_id: string;
  agent_user_id: string;
  title: string;
  description: string | null;
  city: string | null;
  visit_date: string;
  start_time: string;
  meeting_point: string | null;
  price_meeting_point: number;
  price_home_pickup: number;
  max_seats: number;
  property_ids: string[];
  status: PlanStatus;
  rejection_reason: string | null;
  admin_notes: string | null;
  trip_details: string | null;
  vip_available?: boolean;
  price_vip?: number;
  vip_max_people?: number;
  lunch_available?: boolean;
  price_lunch?: number;
  lunch_details?: string | null;
  property_schedule?: ScheduleSlot[];
  state_name?: string | null;
  state_reviewed_at?: string | null;
  rejected_by_level?: string | null;
  created_at: string;
}

export interface ScheduleSlot { property_id: string; start: string; end: string }

export interface SmartVisitBooking {
  is_vip?: boolean;
  lunch_opted?: boolean;
  lunch_amount?: number;
  id: string;
  plan_id: string;
  customer_id: string;
  customer_name: string | null;
  contact_phone: string | null;
  seats: number;
  pickup_type: PickupType;
  pickup_address: string | null;
  drop_address: string | null;
  price_per_person: number;
  total_amount: number;
  status: string;
  pickup_time: string | null;
  agent_message: string | null;
  rating: number | null;
  review: string | null;
  interested_to_buy: boolean;
  interest_note: string | null;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
}

export interface PlanProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  images: any;
  slug?: string | null;
}

const PROPERTY_COLS = "id, title, city, locality, price, images, slug";

export const statusLabel: Record<string, string> = {
  pending_state_review: "Waiting for state admin",
  pending_review: "Waiting for final approval",
  approved: "Live for customers",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
  booked: "Booked",
  confirmed: "Confirmed",
  picked_up: "Picked up",
  no_show: "No show",
};

export const firstImage = (images: any): string | null => {
  if (!images) return null;
  if (Array.isArray(images)) return typeof images[0] === "string" ? images[0] : images[0]?.url ?? null;
  if (typeof images === "string") {
    try { return firstImage(JSON.parse(images)); } catch { return images; }
  }
  return null;
};

export const errMsg = (e: any) => e?.message?.replace(/^.*?ERROR:\s*/, "") || "Something went wrong";

// ---------- Agent ----------
export async function getMyAgent(userId: string) {
  const { data } = await db.from("agents").select("id, name, city, agent_code").eq("user_id", userId).maybeSingle();
  return data as { id: string; name: string; city: string | null; agent_code: string | null } | null;
}

export async function listMyPlans(userId: string) {
  const { data, error } = await db.from("smart_visit_plans").select("*").eq("agent_user_id", userId)
    .order("visit_date", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as SmartVisitPlan[];
}

export async function savePlan(plan: Partial<SmartVisitPlan> & { id?: string }) {
  if (plan.id) {
    const { id, ...rest } = plan;
    const { error } = await db.from("smart_visit_plans").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await db.from("smart_visit_plans").insert(plan);
    if (error) throw error;
  }
}

export async function setPlanStatus(id: string, status: PlanStatus) {
  const { error } = await db.from("smart_visit_plans").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listAgentSelectableProperties(userId: string, search: string) {
  const own = db.from("properties").select(PROPERTY_COLS).eq("submitted_by", userId).limit(50);
  let live = db.from("properties").select(PROPERTY_COLS)
    .in("lifecycle_status", ["live", "live_verified"]).order("created_at", { ascending: false }).limit(30);
  if (search.trim()) live = live.or(`title.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%,locality.ilike.%${search.trim()}%`);
  const [a, b] = await Promise.all([own, live]);
  const map = new Map<string, PlanProperty>();
  [...(a.data ?? []), ...(b.data ?? [])].forEach((p: PlanProperty) => map.set(p.id, p));
  return Array.from(map.values());
}

export async function listPlanBookings(planId: string) {
  const { data, error } = await db.from("smart_visit_bookings").select("*").eq("plan_id", planId).order("created_at");
  if (error) throw error;
  return (data ?? []) as SmartVisitBooking[];
}

export async function updateBooking(id: string, patch: Partial<SmartVisitBooking>) {
  const { error } = await db.from("smart_visit_bookings").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------- Shared ----------
export async function getProperties(ids: string[]) {
  if (!ids?.length) return [] as PlanProperty[];
  const { data } = await db.from("properties").select(PROPERTY_COLS).in("id", ids);
  return (data ?? []) as PlanProperty[];
}

export async function seatsTaken(planId: string) {
  const { data } = await db.rpc("smart_visit_seats_taken", { _plan: planId });
  return Number(data) || 0;
}

export async function agentRating(agentId: string) {
  const { data } = await db.rpc("smart_visit_agent_rating", { _agent: agentId });
  const row = Array.isArray(data) ? data[0] : data;
  return { avg: row?.avg_rating ? Number(row.avg_rating) : null, count: Number(row?.rating_count) || 0 };
}

export async function getAgentsPublic(ids: string[]) {
  if (!ids.length) return [] as any[];
  const { data } = await db.from("agents").select("id, name, agent_code, photo_url, city").in("id", ids);
  return data ?? [];
}

// ---------- Customer ----------
export async function listOpenPlans() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from("smart_visit_plans").select("*").eq("status", "approved")
    .gte("visit_date", today).order("visit_date").limit(100);
  if (error) throw error;
  const now = Date.now();
  // Hide visits whose date + start time has already passed.
  return ((data ?? []) as SmartVisitPlan[]).filter((p) => {
    const t = (p.start_time || "23:59").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let h = t ? Number(t[1]) : 23; const m = t ? Number(t[2]) : 59;
    if (t?.[3]) h = (h % 12) + (t[3].toUpperCase() === "PM" ? 12 : 0);
    const d = new Date(`${p.visit_date?.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return true;
    d.setHours(h, m, 0, 0);
    return d.getTime() > now;
  });
}

export async function listMyBookings(userId: string) {
  const { data, error } = await db.from("smart_visit_bookings")
    .select("*, plan:smart_visit_plans(*)").eq("customer_id", userId).eq("customer_hidden", false).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (SmartVisitBooking & { plan: SmartVisitPlan })[];
}

export async function createBooking(b: {
  plan_id: string; customer_id: string; customer_name: string; contact_phone: string;
  seats: number; pickup_type: PickupType; pickup_address?: string; drop_address?: string;
  is_vip?: boolean; lunch_opted?: boolean;
}) {
  const { data, error } = await db.from("smart_visit_bookings").insert(b).select("id").single();
  if (error) throw error;
  return data.id as string;
}

let rzpScript: Promise<void> | null = null;
const loadRazorpay = () => {
  if ((window as any).Razorpay) return Promise.resolve();
  rzpScript ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res();
    s.onerror = () => { rzpScript = null; rej(new Error("Could not load payment window")); };
    document.body.appendChild(s);
  });
  return rzpScript;
};

/** Opens Razorpay for a booking; resolves only after the server confirms payment. */
export async function payForBooking(bookingId: string, prefill: { name?: string; email?: string; contact?: string }, title: string) {
  await loadRazorpay();
  const { data: order, error } = await supabase.functions.invoke("smart-visit-pay", { body: { action: "create", booking_id: bookingId } });
  if (error || order?.error) throw new Error(order?.error || "Could not start payment");
  if (order?.already) return;
  await new Promise<void>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: "JAAGA X Smart Visit", description: title, prefill, theme: { color: "#10b981" },
      handler: async (r: any) => {
        const { data, error: vErr } = await supabase.functions.invoke("smart-visit-pay", { body: { action: "verify", booking_id: bookingId, ...r } });
        if (vErr || !data?.success) reject(new Error(data?.error || "Payment could not be verified"));
        else resolve();
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed")));
    rzp.open();
  });
}

// ---------- Admin ----------
export async function listPlansForAdmin(status: string) {
  let q = db.from("smart_visit_plans").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SmartVisitPlan[];
}

export async function reviewPlan(id: string, decision: {
  status: "approved" | "rejected" | "pending_review"; price_meeting_point?: number; price_home_pickup?: number;
  rejection_reason?: string; admin_notes?: string;
}) {
  const { error } = await db.from("smart_visit_plans").update(decision).eq("id", id);
  if (error) throw error;
}

export const priceFor = (plan: SmartVisitPlan, pickup: PickupType) =>
  Number(pickup === "home" ? plan.price_home_pickup : plan.price_meeting_point);

/** "14:00" -> "2:00 PM" */
export const fmt12 = (t?: string) => {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

export const inr = (n: number | null | undefined) =>
  n == null ? "N/A" : `₹${Number(n).toLocaleString("en-IN")}`;
