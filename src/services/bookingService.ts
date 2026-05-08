import { supabase } from "@/integrations/supabase/client";

/**
 * Booking service — visit bookings + hotel bookings.
 * Thin wrappers; specialized flows still use dedicated edge functions
 * (schedule-visit, approve-visit, verify-visit, etc.) — those should be
 * called via aiService / dedicated services as they are migrated.
 */

export async function listBuyerVisits(userId: string) {
  const { data, error } = await (supabase as any)
    .from("visits")
    .select("*")
    .eq("buyer_id", userId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAgentVisits(agentId: string) {
  const { data, error } = await (supabase as any)
    .from("visits")
    .select("*")
    .eq("agent_id", agentId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listHotelBookings(userId: string) {
  const { data, error } = await (supabase as any)
    .from("hotel_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("check_in", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBooking(id: string) {
  const { data, error } = await (supabase as any)
    .from("visits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
