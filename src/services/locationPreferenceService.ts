import { supabase } from "@/integrations/supabase/client";

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

export interface LocationStats {
  total: number;
  preferred: number;
  visited: number;
  searched: number;
}

export const locationPreferenceService = {
  // ---- Get all preferred locations ----
  async getPreferredLocations(builderProfileId: string): Promise<PreferredLocation[]> {
    try {
      const { data, error } = await supabase
        .from("preferred_locations")
        .select("*")
        .eq("builder_profile_id", builderProfileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PreferredLocation[];
    } catch (error) {
      console.error("Error fetching preferred locations:", error);
      throw error;
    }
  },

  // ---- Add a preferred location ----
  async addPreferredLocation(builderProfileId: string, data: NewLocationInput): Promise<PreferredLocation> {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const payload = {
        user_id: userId,
        location_name: [data.locality, data.city].filter(Boolean).join(", ") || data.city,
        builder_profile_id: builderProfileId,
        city: data.city,
        locality: data.locality ?? null,
        pincode: data.pincode ?? null,
        location_type: data.location_type ?? "preferred",
        source: data.source ?? "manual",
        property_id: data.property_id ?? null,
      };

      const { data: inserted, error } = await supabase.from("preferred_locations").insert(payload).select().single();

      if (error) throw error;
      return inserted as PreferredLocation;
    } catch (error) {
      console.error("Error adding preferred location:", error);
      throw error;
    }
  },

  // ---- Remove a preferred location ----
  async removePreferredLocation(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("preferred_locations").delete().eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing preferred location:", error);
      throw error;
    }
  },

  // ---- Track a visited property location ----
  async trackVisitedLocation(builderProfileId: string, propertyId: string): Promise<void> {
    try {
      const { data: property, error } = await supabase
        .from("properties")
        .select("city, locality, pincode")
        .eq("id", propertyId)
        .maybeSingle();

      if (error) throw error;
      if (!property?.city) return;

      await this.addPreferredLocation(builderProfileId, {
        city: property.city,
        locality: property.locality,
        pincode: property.pincode,
        location_type: "visited",
        source: "property_visit",
        property_id: propertyId,
      });
    } catch (error) {
      console.error("Error tracking visited location:", error);
      throw error;
    }
  },

  // ---- Track a searched location ----
  async trackSearchedLocation(builderProfileId: string, city: string, locality?: string): Promise<void> {
    try {
      if (!city) return;

      await this.addPreferredLocation(builderProfileId, {
        city,
        locality,
        location_type: "searched",
        source: "property_search",
      });
    } catch (error) {
      console.error("Error tracking searched location:", error);
      throw error;
    }
  },

  // ---- Get recommendation locations (sorted by frequency) ----
  async getRecommendationLocations(builderProfileId: string): Promise<PreferredLocation[]> {
    try {
      const all = await this.getPreferredLocations(builderProfileId);

      const counts = new Map<string, { loc: PreferredLocation; count: number }>();
      for (const loc of all) {
        const key = `${loc.city}|${loc.locality ?? ""}`;
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { loc, count: 1 });
        }
      }

      return [...counts.values()].sort((a, b) => b.count - a.count).map((c) => c.loc);
    } catch (error) {
      console.error("Error getting recommendation locations:", error);
      throw error;
    }
  },

  // ---- Get location stats ----
  async getLocationStats(builderProfileId: string): Promise<LocationStats> {
    try {
      const all = await this.getPreferredLocations(builderProfileId);

      return {
        total: all.length,
        preferred: all.filter((l) => l.location_type === "preferred").length,
        visited: all.filter((l) => l.location_type === "visited").length,
        searched: all.filter((l) => l.location_type === "searched").length,
      };
    } catch (error) {
      console.error("Error getting location stats:", error);
      throw error;
    }
  },
};

export default locationPreferenceService;
