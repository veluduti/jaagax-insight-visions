import { supabase } from "@/integrations/supabase/client";

/** Public, read-only highlights; no guest, employee or booking data is requested. */
export async function getPartnerLoginHighlights() {
  const [hotels, stats] = await Promise.all([
    supabase.from("partner_hotels").select("id,name,city", { count: "exact" })
      .eq("is_active", true).order("name").limit(5),
    supabase.rpc("get_platform_stats"),
  ]);
  if (hotels.error) throw hotels.error;
  const values = stats.error ? null : stats.data as Record<string, unknown> | null;
  return {
    hotels: hotels.data ?? [],
    hotelCount: hotels.count ?? 0,
    cities: values ? Number(values.cities ?? 0) : null,
    reviewCount: values ? Number(values.rating_count ?? 0) : null,
    rating: values?.avg_rating == null ? null : Number(values.avg_rating),
  };
}