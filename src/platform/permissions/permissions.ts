/**
 * Permission Service
 * ------------------
 * Thin wrapper over the `has_permission(user, resource, action)`
 * database function so any UI, guard, or hook can gate features
 * consistently. Cached per-user for the session.
 */
import { supabase } from "@/integrations/supabase/client";

type CacheEntry = { value: boolean; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function cacheKey(userId: string, resource: string, action: string) {
  return `${userId}:${resource}:${action}`;
}

export async function hasPermission(
  userId: string | null | undefined,
  resource: string,
  action: string,
): Promise<boolean> {
  if (!userId) return false;
  const key = cacheKey(userId, resource, action);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const { data, error } = await supabase.rpc("has_permission" as never, {
    _user_id: userId,
    _resource: resource,
    _action: action,
  } as never);

  const value = !error && Boolean(data);
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function resolveRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("resolve_roles" as never, {
    _user_id: userId,
  } as never);
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as string[]).filter(Boolean);
}

export function invalidatePermissionCache(userId?: string): void {
  if (!userId) return cache.clear();
  for (const k of cache.keys()) if (k.startsWith(`${userId}:`)) cache.delete(k);
}
