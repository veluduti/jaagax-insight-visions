import { supabase } from "@/integrations/supabase/client";

/**
 * Hotel image paths stored on partner_hotels.images may be either:
 *   - a full http(s) URL (external Unsplash or already-resolved public URL), OR
 *   - a storage object path inside the (private) `hotel-documents` bucket
 *     e.g. "userId/photo-1783.png"
 *
 * This helper normalizes them into displayable URLs. For storage paths we
 * generate a long-lived (7 day) signed URL. Results are cached in-memory
 * to avoid re-signing on every render.
 */

const BUCKET = "hotel-documents";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const cache = new Map<string, string>();

const FALLBACK =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60";

export function isFullUrl(v?: string | null): boolean {
  if (!v) return false;
  return /^(https?:)?\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:");
}

export async function resolveHotelImage(pathOrUrl?: string | null): Promise<string> {
  if (!pathOrUrl) return FALLBACK;
  if (isFullUrl(pathOrUrl)) return pathOrUrl;
  const cached = cache.get(pathOrUrl);
  if (cached) return cached;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pathOrUrl, TTL_SECONDS);
    if (error || !data?.signedUrl) return FALLBACK;
    cache.set(pathOrUrl, data.signedUrl);
    return data.signedUrl;
  } catch {
    return FALLBACK;
  }
}

export async function resolveHotelImages(list?: (string | null)[] | null): Promise<string[]> {
  if (!list || !list.length) return [];
  return Promise.all(list.filter(Boolean).map((p) => resolveHotelImage(p as string)));
}

export const HOTEL_IMAGE_FALLBACK = FALLBACK;
