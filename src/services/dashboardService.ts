import { supabase } from "@/integrations/supabase/client";

/**
 * Aggregated dashboard data per role. Keep queries here so individual
 * dashboard pages stay rendering-focused.
 */

export async function getBuyerDashboardSummary(userId: string) {
  const [favorites, visits, bookings] = await Promise.all([
    (supabase as any).from("favorites").select("property_id", { count: "exact", head: true }).eq("user_id", userId),
    (supabase as any).from("visits").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
    (supabase as any).from("hotel_bookings").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    favoritesCount: favorites.count ?? 0,
    visitsCount: visits.count ?? 0,
    bookingsCount: bookings.count ?? 0,
  };
}

export async function getAgentDashboardSummary(agentId: string) {
  const [visits, properties] = await Promise.all([
    (supabase as any).from("visits").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
    (supabase as any).from("properties").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
  ]);
  return {
    visitsCount: visits.count ?? 0,
    propertiesCount: properties.count ?? 0,
  };
}

export async function getBuilderDashboardSummary(userId: string) {
  const [projects, properties] = await Promise.all([
    (supabase as any).from("projects").select("id", { count: "exact", head: true }).eq("submitted_by", userId),
    (supabase as any).from("properties").select("id", { count: "exact", head: true }).eq("submitted_by", userId),
  ]);
  return {
    projectsCount: projects.count ?? 0,
    propertiesCount: properties.count ?? 0,
  };
}
