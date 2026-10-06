import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type Trip = {
  id: string; hotel_id: string; hotel_name: string | null; room_type: string | null; check_in: string; check_out: string;
  status: string | null; payment_status: string | null; total_amount: number | null; booking_reference: string | null;
  num_guests: number | null; created_at: string; cancellation_reason: string | null;
};

export type TripStage = "awaiting_payment" | "upcoming" | "staying" | "completed" | "cancelled";

const today = () => new Date().toISOString().slice(0, 10);

export function tripStage(t: Trip): TripStage {
  const s = String(t.status || "").toLowerCase();
  if (["cancelled", "canceled", "rejected"].includes(s)) return "cancelled";
  if (s === "checked_out" || t.check_out < today()) return "completed";
  if (s === "pending" && (t.payment_status || "pending") !== "paid") return "awaiting_payment";
  if (s === "checked_in" || (t.check_in <= today() && t.check_out >= today())) return "staying";
  return "upcoming";
}

/** Minutes left before an unpaid booking releases its room (matches the 20-minute server rule). */
export function holdMinutesLeft(t: Trip) {
  return Math.max(0, 20 - Math.floor((Date.now() - new Date(t.created_at).getTime()) / 60000));
}

export async function loadMyTrips(): Promise<{ trips: Trip[]; reviewed: Set<string> }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { trips: [], reviewed: new Set() };
  const [b, r] = await Promise.all([
    sb.from("hotel_bookings")
      .select("id,hotel_id,hotel_name,room_type,check_in,check_out,status,payment_status,total_amount,booking_reference,num_guests,created_at,cancellation_reason")
      .eq("user_id", user.id).order("check_in", { ascending: false }).limit(100),
    sb.from("hotel_reviews").select("booking_id").eq("guest_user_id", user.id),
  ]);
  if (b.error) throw b.error;
  return { trips: b.data ?? [], reviewed: new Set((r.data ?? []).map((x: any) => x.booking_id)) };
}

export async function sendTripMessage(t: Trip, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hotel_guest_messages").insert({
    hotel_id: t.hotel_id, booking_id: t.id, guest_user_id: user?.id, sender: "guest", body,
  });
  if (error) throw error;
}

export async function submitReview(t: Trip, rating: number, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hotel_reviews").insert({
    hotel_id: t.hotel_id, booking_id: t.id, guest_user_id: user?.id, rating, body,
    guest_name: user?.user_metadata?.full_name ?? null,
  });
  if (error) throw error;
}

export async function cancelTrip(t: Trip, reason: string) {
  const { data, error } = await supabase.functions.invoke("hotel-booking-cancel", {
    body: { booking_id: t.id, reason, cancelled_by: "guest" },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
}
