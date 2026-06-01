import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFeaturedProperties,
  getFavoritePropertyIds,
  addFavorite,
  removeFavorite,
} from "@/services/propertyService";
import { queryKeys, STALE } from "./queryKeys";

// Re-export for backwards compatibility with existing imports.
export const propertyKeys = {
  all: queryKeys.properties.all,
  featured: queryKeys.properties.featured,
  favorites: queryKeys.properties.favorites,
};

export function useFeaturedProperties(detectedCity?: string) {
  return useQuery({
    queryKey: queryKeys.properties.featured(detectedCity),
    queryFn: () => getFeaturedProperties(detectedCity),
    staleTime: STALE.MEDIUM,
  });
}

export function useFavoriteIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.properties.favorites(userId),
    queryFn: () => getFavoritePropertyIds(userId as string),
    enabled: !!userId,
    staleTime: STALE.SHORT,
  });
}

/**
 * Optimistic toggle: updates the cached favorites list immediately,
 * rolls back on error, and reconciles in the background.
 */
export function useToggleFavorite(userId: string | null | undefined) {
  const qc = useQueryClient();
  const key = queryKeys.properties.favorites(userId);

  return useMutation({
    mutationFn: async ({ propertyId, isFav }: { propertyId: string; isFav: boolean }) => {
      if (!userId) throw new Error("Not authenticated");
      if (isFav) await removeFavorite(userId, propertyId);
      else await addFavorite(userId, propertyId);
    },
    onMutate: async ({ propertyId, isFav }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<string[]>(key) ?? [];
      const next = isFav ? prev.filter((id) => id !== propertyId) : [...prev, propertyId];
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
