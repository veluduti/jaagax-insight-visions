import { supabase } from "@/integrations/supabase/client";
import { toPublicRow } from "./propertyService";
import type { PropertyRow } from "./types";

export interface SearchFilters {
  city?: string | null;
  locality?: string | null;
  type?: string | null;
  listing_type?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  bhk?: number | null;
  query?: string | null;
  limit?: number;
}

export async function searchProperties(filters: SearchFilters = {}): Promise<PropertyRow[]> {
  let q: any = (supabase.from("properties" as any).select("*") as any)
    .neq("is_draft", true)
    .not("title", "is", null);

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.locality) q = q.ilike("locality", `%${filters.locality}%`);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.listing_type) q = q.eq("listing_type", filters.listing_type);
  if (filters.minPrice != null) q = q.gte("price", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
  if (filters.bhk != null) q = q.eq("bhk", filters.bhk);
  if (filters.query) q = q.ilike("title", `%${filters.query}%`);

  q = q.limit(filters.limit ?? 60);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) ?? []).map(toPublicRow);
}

export async function searchPropertiesNearby(
  lat: number,
  lng: number,
  radiusKm = 10,
  page = 1,
  limit = 20,
) {
  const { data, error } = await (supabase as any).rpc("search_properties_nearby", {
    _lat: lat,
    _lng: lng,
    _radius_km: radiusKm,
    _page: page,
    _limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}
