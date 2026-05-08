import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFeaturedProperties,
  getPartialProperties,
  getFavoritePropertyIds,
  addFavorite,
  removeFavorite,
} from "@/services/propertyService";

export const propertyKeys = {
  all: ["properties"] as const,
  featured: (city?: string) => [...propertyKeys.all, "featured", city ?? "all"] as const,
  partial: (city?: string) => [...propertyKeys.all, "partial", city ?? "all"] as const,
  favorites: (userId: string | null | undefined) => ["favorites", userId ?? "anon"] as const,
};

export function useFeaturedProperties(detectedCity?: string) {
  return useQuery({
    queryKey: propertyKeys.featured(detectedCity),
    queryFn: () => getFeaturedProperties(detectedCity),
    staleTime: 60_000,
  });
}

export function usePartialProperties(detectedCity?: string) {
  return useQuery({
    queryKey: propertyKeys.partial(detectedCity),
    queryFn: () => getPartialProperties(detectedCity),
    staleTime: 60_000,
  });
}

export function useFavoriteIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: propertyKeys.favorites(userId),
    queryFn: () => getFavoritePropertyIds(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useToggleFavorite(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, isFav }: { propertyId: string; isFav: boolean }) => {
      if (!userId) throw new Error("Not authenticated");
      if (isFav) await removeFavorite(userId, propertyId);
      else await addFavorite(userId, propertyId);
      return { propertyId, isFav: !isFav };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.favorites(userId) });
    },
  });
}
