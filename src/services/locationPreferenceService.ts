import { fromTable } from "@/lib/supabaseHelper";

export type LocationType = "preferred" | "visited" | "searched";
export type LocationSource = "manual" | "property_visit" | "property_search";

export interface PreferredLocation {
  id: string;
  builder_profile_id: string;
  city: string;
  locality?: string | null;
  pincode?: string | null;
  location_type: LocationType;
  source: LocationSource;
  property_id?: string | null;
  created_at: string;
}

export interface NewLocationInput {
  city: string;
  locality?: string;
  pincode?: string;
  location_type?: LocationType;
  source?: LocationSource;
  property_id?: string;
}

export async function getPreferredLocations(builderProfileId: string): Promise<PreferredLocation[]> {
  const { data, error } = await fromTable("preferred_locations")
    .select("*")
    .eq("builder_profile_id", builderProfileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PreferredLocation[];
}

export async function addPreferredLocation(
  builderProfileId: string,
  data: NewLocationInput
): Promise<PreferredLocation> {
  const payload = {
    builder_profile_id: builderProfileId,
    city: data.city,
    locality: data.locality ?? null,
    pincode: data.pincode ?? null,
    location_type: data.location_type ?? "preferred",
    source: data.source ?? "manual",
    property_id: data.property_id ?? null,
    location_name: [data.city, data.locality].filter(Boolean).join(", "),
  };
  const { data: inserted, error } = await fromTable("preferred_locations")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return inserted as PreferredLocation;
}

export async function removePreferredLocation(id: string): Promise<void> {
  const { error } = await fromTable("preferred_locations").delete().eq("id", id);
  if (error) throw error;
}

export async function trackVisitedLocation(
  builderProfileId: string,
  propertyId: string
): Promise<void> {
  const { data: property } = await fromTable("properties")
    .select("city, locality, pincode")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property?.city) return;
  await addPreferredLocation(builderProfileId, {
    city: property.city,
    locality: property.locality,
    pincode: property.pincode,
    location_type: "visited",
    source: "property_visit",
    property_id: propertyId,
  });
}

export async function trackSearchedLocation(
  builderProfileId: string,
  city: string,
  locality?: string
): Promise<void> {
  if (!city) return;
  await addPreferredLocation(builderProfileId, {
    city,
    locality,
    location_type: "searched",
    source: "property_search",
  });
}

export async function getRecommendationLocations(
  builderProfileId: string
): Promise<PreferredLocation[]> {
  const all = await getPreferredLocations(builderProfileId);
  const counts = new Map<string, { loc: PreferredLocation; count: number }>();
  for (const l of all) {
    const key = `${l.city}|${l.locality ?? ""}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { loc: l, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).map((c) => c.loc);
}

export async function getLocationStats(builderProfileId: string) {
  const all = await getPreferredLocations(builderProfileId);
  return {
    total: all.length,
    preferred: all.filter((l) => l.location_type === "preferred").length,
    visited: all.filter((l) => l.location_type === "visited").length,
    searched: all.filter((l) => l.location_type === "searched").length,
  };
}
