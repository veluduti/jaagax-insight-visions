import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Location Master hooks — single source of truth for
 * Country → State → District → City → Locality across JaagaX.
 *
 * All rows are publicly readable, so these queries work for anon + authed users.
 */

export interface LocCountry { id: string; name: string; iso2?: string | null; slug: string; }
export interface LocState   { id: string; country_id: string; name: string; slug: string; }
export interface LocDistrict{ id: string; state_id: string; name: string; slug: string; }
export interface LocCity    { id: string; district_id: string; name: string; slug: string; }
export interface LocLocality{ id: string; city_id: string; name: string; slug: string; pincode?: string | null; }

const STALE = 1000 * 60 * 30; // 30 min

export const useLocCountries = () =>
  useQuery({
    queryKey: ["loc", "countries"],
    staleTime: STALE,
    queryFn: async (): Promise<LocCountry[]> => {
      const { data, error } = await (supabase as any)
        .from("loc_countries")
        .select("id,name,iso2,slug")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLocStates = (countryId?: string | null) =>
  useQuery({
    queryKey: ["loc", "states", countryId ?? "none"],
    staleTime: STALE,
    enabled: !!countryId,
    queryFn: async (): Promise<LocState[]> => {
      const { data, error } = await (supabase as any)
        .from("loc_states")
        .select("id,country_id,name,slug")
        .eq("country_id", countryId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLocDistricts = (stateId?: string | null) =>
  useQuery({
    queryKey: ["loc", "districts", stateId ?? "none"],
    staleTime: STALE,
    enabled: !!stateId,
    queryFn: async (): Promise<LocDistrict[]> => {
      const { data, error } = await (supabase as any)
        .from("loc_districts")
        .select("id,state_id,name,slug")
        .eq("state_id", stateId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLocCities = (districtId?: string | null) =>
  useQuery({
    queryKey: ["loc", "cities", districtId ?? "none"],
    staleTime: STALE,
    enabled: !!districtId,
    queryFn: async (): Promise<LocCity[]> => {
      const { data, error } = await (supabase as any)
        .from("loc_cities")
        .select("id,district_id,name,slug")
        .eq("district_id", districtId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLocLocalities = (cityId?: string | null) =>
  useQuery({
    queryKey: ["loc", "localities", cityId ?? "none"],
    staleTime: STALE,
    enabled: !!cityId,
    queryFn: async (): Promise<LocLocality[]> => {
      const { data, error } = await (supabase as any)
        .from("loc_localities")
        .select("id,city_id,name,slug,pincode")
        .eq("city_id", cityId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export interface MasterLocationSelection {
  country_id: string | null;
  state_id: string | null;
  district_id: string | null;
  city_id: string | null;
  locality_id: string | null;
  // Denormalized names for legacy text columns
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  locality?: string | null;
}

export const emptyMasterLocation: MasterLocationSelection = {
  country_id: null,
  state_id: null,
  district_id: null,
  city_id: null,
  locality_id: null,
  country: null,
  state: null,
  district: null,
  city: null,
  locality: null,
};
