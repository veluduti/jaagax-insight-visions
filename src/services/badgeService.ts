import { supabase } from "@/integrations/supabase/client";

export interface BadgeDefinition {
  id: string;
  name: string;
  tier: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  requirements: Record<string, any> | null;
  min_properties: number;
  min_reviews: number;
  min_rating: number;
}

export interface UserBadge {
  id: string;
  builder_profile_id: string;
  badge_id: string;
  earned_at: string;
  is_current: boolean;
  badge?: BadgeDefinition;
}

export interface BuilderMetrics {
  properties: number;
  reviews: number;
  avg_rating: number;
}

async function getMetrics(builderProfileId: string): Promise<BuilderMetrics> {
  // Get user_id from builder profile
  const { data: bp } = await supabase
    .from("builder_profiles")
    .select("user_id")
    .eq("id", builderProfileId)
    .maybeSingle();

  const userId = bp?.user_id;

  // Get properties count
  const { count: properties } = userId
    ? await supabase.from("properties").select("id", { count: "exact", head: true }).eq("submitted_by", userId)
    : { count: 0 };

  // FIXED: Try agent_ratings first, fallback to ratings or empty array
  let ratings: { rating: number }[] = [];
  try {
    const { data: ratingsData } = await supabase.from("agent_ratings").select("rating").eq("agent_id", userId);
    if (ratingsData) {
      ratings = ratingsData as { rating: number }[];
    }
  } catch {
    // Table might not exist, try alternative table name
    try {
      const { data: ratingsData } = await supabase
        .from("builder_ratings")
        .select("rating")
        .eq("builder_id", builderProfileId);
      if (ratingsData) {
        ratings = ratingsData as { rating: number }[];
      }
    } catch {
      // No ratings table exists, use empty array
    }
  }

  const avg = ratings.length ? ratings.reduce((s, r) => s + Number(r.rating || 0), 0) / ratings.length : 0;

  return {
    properties: properties || 0,
    reviews: ratings.length,
    avg_rating: Number(avg.toFixed(2)),
  };
}

export const badgeService = {
  async getAllBadges(): Promise<BadgeDefinition[]> {
    const { data, error } = await supabase.from("badge_definitions").select("*").order("tier", { ascending: true });
    if (error) throw error;
    return (data ?? []) as BadgeDefinition[];
  },

  async getCurrentBadge(builderProfileId: string): Promise<BadgeDefinition | null> {
    const { data, error } = await supabase
      .from("user_badges")
      .select("*, badge:badge_definitions(*)")
      .eq("builder_profile_id", builderProfileId)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw error;
    return (data?.badge as BadgeDefinition) ?? null;
  },

  async getBadgeHistory(builderProfileId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from("user_badges")
      .select("*, badge:badge_definitions(*)")
      .eq("builder_profile_id", builderProfileId)
      .order("earned_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserBadge[];
  },

  async getBadgeRequirements(badgeId: string): Promise<BadgeDefinition | null> {
    const { data, error } = await supabase.from("badge_definitions").select("*").eq("id", badgeId).maybeSingle();
    if (error) throw error;
    return data as BadgeDefinition | null;
  },

  async getMetrics(builderProfileId: string): Promise<BuilderMetrics> {
    return getMetrics(builderProfileId);
  },

  async getBadgeProgress(builderProfileId: string) {
    const [badges, metrics] = await Promise.all([this.getAllBadges(), getMetrics(builderProfileId)]);

    const earned = badges.filter(
      (b) =>
        metrics.properties >= b.min_properties &&
        metrics.reviews >= b.min_reviews &&
        metrics.avg_rating >= b.min_rating,
    );

    const current = earned[earned.length - 1] ?? badges[0];
    const next = badges.find((b) => b.tier === (current?.tier ?? 0) + 1) ?? null;

    let progress = 100;
    if (next) {
      const p = next.min_properties ? Math.min(metrics.properties / next.min_properties, 1) : 1;
      const r = next.min_reviews ? Math.min(metrics.reviews / next.min_reviews, 1) : 1;
      const rt = next.min_rating ? Math.min(metrics.avg_rating / next.min_rating, 1) : 1;
      progress = Math.round(((p + r + rt) / 3) * 100);
    }

    return { current, next, progress, metrics, allBadges: badges };
  },

  async checkAndUpdateBadge(builderProfileId: string): Promise<BadgeDefinition | null> {
    const { current } = await this.getBadgeProgress(builderProfileId);
    if (!current) return null;

    // Set all badges for this builder to not current
    await supabase.from("user_badges").update({ is_current: false }).eq("builder_profile_id", builderProfileId);

    // Upsert the new current badge
    const { data } = await supabase
      .from("user_badges")
      .upsert(
        {
          builder_profile_id: builderProfileId,
          badge_id: current.id,
          is_current: true,
          earned_at: new Date().toISOString(),
        },
        { onConflict: "builder_profile_id,badge_id" },
      )
      .select();

    return current;
  },
};

export default badgeService;
