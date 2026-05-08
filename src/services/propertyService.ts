import { supabase } from "@/integrations/supabase/client";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { classifyProperty } from "@/lib/propertyClassifier";
import { canonicalizeCity, isSameCity } from "@/lib/cityNormalizer";
import type { PropertyRow } from "./types";

/**
 * Normalize a raw DB row through the public-view sanitizer used across the app.
 */
export const toPublicRow = (row: any): PropertyRow => {
  const v = getPublicPropertyView(row);
  if (!v) return row;
  return {
    ...row,
    title: v.title,
    city: v.city ?? row.city,
    locality: v.locality ?? row.locality,
    price: v.price ?? row.price,
    area_sqft: v.area_sqft ?? row.area_sqft,
    bhk: v.bhk ?? row.bhk,
    bedrooms: v.bedrooms ?? row.bedrooms,
    bathrooms: v.bathrooms ?? row.bathrooms,
    type: v.type ?? row.type,
    images: v.images?.length ? v.images : row.images,
    amenities: v.amenities?.length ? v.amenities : row.amenities,
    description: v.description ?? row.description,
  };
};

interface ListOptions {
  detectedCity?: string;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Base public listing query — non-draft, has title + city. Returns normalized rows.
 */
async function fetchPublicProperties(opts: ListOptions = {}): Promise<PropertyRow[]> {
  const { limit = 120, orderBy } = opts;
  let query: any = (supabase.from("properties" as any).select("*") as any)
    .neq("is_draft", true)
    .not("title", "is", null)
    .not("city", "is", null);

  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  }
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return ((data as any[]) || []).map(toPublicRow);
}

/**
 * Properties classified as "featured", optionally city-filtered.
 */
export async function getFeaturedProperties(detectedCity?: string): Promise<PropertyRow[]> {
  const rows = await fetchPublicProperties({
    orderBy: { column: "trust_score", ascending: false },
  });
  const normalizedCity = canonicalizeCity(detectedCity);
  return rows
    .filter((p) => !detectedCity || isSameCity(p.city, normalizedCity))
    .filter((p) => classifyProperty(p) === "featured")
    .slice(0, 4);
}

/**
 * Properties classified as "basic" / partial info, optionally city-filtered.
 */
export async function getPartialProperties(detectedCity?: string): Promise<PropertyRow[]> {
  const rows = await fetchPublicProperties({
    orderBy: { column: "updated_at", ascending: false },
  });
  const normalizedCity = canonicalizeCity(detectedCity);
  return rows
    .filter((p) => !detectedCity || isSameCity(p.city, normalizedCity))
    .filter((p) => classifyProperty(p) === "basic")
    .slice(0, 8);
}

/* ---------------- Favorites ---------------- */

export async function getFavoritePropertyIds(userId: string): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from("favorites")
    .select("property_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.property_id);
}

export async function addFavorite(userId: string, propertyId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("favorites")
    .insert({ user_id: userId, property_id: propertyId });
  if (error) throw error;
}

export async function removeFavorite(userId: string, propertyId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("property_id", propertyId);
  if (error) throw error;
}
