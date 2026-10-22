import { supabase } from "@/integrations/supabase/client";
import { getCityAliases, isSameCity } from "@/lib/cityNormalizer";
import { DESTINATION_GUIDES, destinationKey, eligibleRecommendationProperty, type PlaceRecommendation } from "@/lib/smartStayRecommendations";
import { PROPERTY_CARD_COLUMNS, toPublicRow } from "./propertyService";
import { searchPropertiesNearby } from "./searchService";
import type { PropertyRow } from "./types";

const db = supabase as any;
export const SMART_STAY_PROPERTY_RADIUS_KM = 25;
export interface DestinationRecommendations {
  places: PlaceRecommendation[];
  properties: PropertyRow[];
  propertyError: boolean;
  experienceError: boolean;
}

async function destinationCenter(destination: string): Promise<[number, number] | null> {
  const known = DESTINATION_GUIDES[destinationKey(destination)];
  if (known) return known.center;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const [point] = await response.json();
    const lat = Number(point?.lat), lng = Number(point?.lon);
    return point && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  } catch { return null; }
}

export async function getDestinationRecommendations(destination: string): Promise<DestinationRecommendations> {
  const key = destinationKey(destination);
  const base = DESTINATION_GUIDES[key]?.places ?? [];
  const [experiences, properties] = await Promise.allSettled([
    (async () => {
      const { data, error } = await db.from("travel_experiences")
        .select("title, description, city, category, status").eq("status", "approved").in("city", getCityAliases(key)).limit(16);
      if (error) throw error;
      return (data ?? []).filter((x: any) => x.status === "approved" && isSameCity(x.city, key)).map((x: any): PlaceRecommendation => ({
        name: x.title, reason: x.description || "A JaagaX-listed local experience.",
        group: /hidden|offbeat/i.test(x.category) ? "Hidden gems" : /landmark|heritage|attraction/i.test(x.category) ? "Must-visit" : "Local experiences",
      }));
    })(),
    (async () => {
      const center = await destinationCenter(destination);
      const [nearby, cityRows] = await Promise.all([
        center ? searchPropertiesNearby(center[0], center[1], SMART_STAY_PROPERTY_RADIUS_KM, 1, 12) : Promise.resolve([]),
        db.from("properties").select(PROPERTY_CARD_COLUMNS).eq("verified", true).eq("is_live", true).in("city", getCityAliases(key)).limit(30),
      ]);
      if (cityRows.error) throw cityRows.error;
      const legacy = (cityRows.data ?? []).filter((p: PropertyRow) => (p.latitude == null || p.longitude == null) && isSameCity(p.city, key));
      return Array.from(new Map([...nearby, ...legacy].filter(p => eligibleRecommendationProperty(p, SMART_STAY_PROPERTY_RADIUS_KM)).map(p => [p.id, toPublicRow(p)])).values()).slice(0, 4);
    })(),
  ]);
  const places = [...base, ...(experiences.status === "fulfilled" ? experiences.value : [])];
  return {
    places: Array.from(new Map(places.map(p => [p.name.toLowerCase(), p])).values()),
    properties: properties.status === "fulfilled" ? properties.value : [],
    propertyError: properties.status === "rejected",
    experienceError: experiences.status === "rejected",
  };
}