import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type PortalProperty = { id: string; name: string; city: string; locality: string | null; property_reference: string | null; business_types: string[]; image: string | null };
export function usePortal(slug: string | undefined) {
  return useQuery({ queryKey: ["property-portal", slug], enabled: !!slug, queryFn: async () => {
    const { data, error } = await (supabase as any).rpc("property_portal", { _slug: slug });
    if (error) throw error; return (data?.[0] ?? null) as PortalProperty | null;
  } });
}
export const typeLabel = (t: string[] = []) => ({ pg: "PG", hostel: "Hostel", coliving: "Co-living", co_living: "Co-living", resort: "Resort", serviced_apartment: "Service Apartment", villa: "Villa", homestay: "Homestay" } as Record<string, string>)[t[0]] ?? "Hotel";
