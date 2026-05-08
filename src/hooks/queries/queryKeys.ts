/**
 * Centralized React Query key registry. Importing keys from here keeps
 * cache invalidation predictable across the app.
 *
 * Stale-time tiers (used by hooks; tweak per-call when needed):
 *   - INSTANT: data that should feel live (notifications) → 30s
 *   - SHORT: user-scoped working data (favorites, bookings) → 60s
 *   - MEDIUM: list-style content (properties, search) → 2-5 min
 *   - LONG: rarely-changing reference data (cities, builders) → 30 min
 */
export const STALE = {
  INSTANT: 30_000,
  SHORT: 60_000,
  MEDIUM: 2 * 60_000,
  LONG: 30 * 60_000,
} as const;

export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
    user: ["auth", "user"] as const,
  },
  properties: {
    all: ["properties"] as const,
    featured: (city?: string) => ["properties", "featured", city ?? "all"] as const,
    partial: (city?: string) => ["properties", "partial", city ?? "all"] as const,
    detail: (idOrSlug: string) => ["properties", "detail", idOrSlug] as const,
    favorites: (userId: string | null | undefined) => ["favorites", userId ?? "anon"] as const,
  },
  search: {
    properties: (filters: Record<string, unknown>) => ["search", "properties", filters] as const,
    nearby: (lat: number, lng: number, r: number) => ["search", "nearby", lat, lng, r] as const,
  },
  bookings: {
    visits: (userId: string) => ["bookings", "visits", userId] as const,
    agentVisits: (agentId: string) => ["bookings", "agent-visits", agentId] as const,
    hotel: (userId: string) => ["bookings", "hotel", userId] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },
  dashboard: {
    buyer: (userId: string) => ["dashboard", "buyer", userId] as const,
    agent: (agentId: string) => ["dashboard", "agent", agentId] as const,
    builder: (userId: string) => ["dashboard", "builder", userId] as const,
  },
  notifications: {
    list: (userId: string | null | undefined) => ["notifications", userId ?? "anon"] as const,
  },
};
