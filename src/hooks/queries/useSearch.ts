import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchProperties, searchPropertiesNearby, type SearchFilters } from "@/services/searchService";
import { queryKeys, STALE } from "./queryKeys";

export function useSearchProperties(filters: SearchFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search.properties(filters as Record<string, unknown>),
    queryFn: () => searchProperties(filters),
    enabled,
    staleTime: STALE.MEDIUM,
    placeholderData: keepPreviousData,
  });
}

export function useNearbyProperties(
  lat: number | null | undefined,
  lng: number | null | undefined,
  radiusKm = 10,
) {
  return useQuery({
    queryKey: queryKeys.search.nearby(lat ?? 0, lng ?? 0, radiusKm),
    queryFn: () => searchPropertiesNearby(lat as number, lng as number, radiusKm),
    enabled: lat != null && lng != null,
    staleTime: STALE.MEDIUM,
    placeholderData: keepPreviousData,
  });
}
