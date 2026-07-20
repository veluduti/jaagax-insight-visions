/**
 * useRecommendations — fetches `nl_recommendations_cache`, triggers regeneration
 * via the `nl-recommendations` edge function, and records feedback in
 * `nl_recommendation_feedback`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";

const sb = supabase as any;

export type RecCategory =
  | "land"
  | "weekend_farming"
  | "investment"
  | "tourism"
  | "learning"
  | "community";

export interface RecRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  item_type: RecCategory;
  item_id: string | null;
  item_ref: string | null;
  title: string;
  score: number;
  reason: string | null;
  matched_tags: string[];
  payload: Record<string, any>;
  rank: number;
  created_at: string;
}

export function useRecommendations(userId: string | null | undefined) {
  const [items, setItems] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await sb
      .from("nl_recommendations_cache")
      .select("*")
      .eq("user_id", userId)
      .order("item_type", { ascending: true })
      .order("rank", { ascending: true });
    if (error) setError(error.message);
    setItems(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(
    async (force = false) => {
      if (!userId || busy) return;
      setBusy(true);
      setError(null);
      try {
        const { data, error: fnError } = await (supabase.functions as any).invoke("nl-recommendations", {
          body: { force },
        });
        if (fnError) throw fnError;
        if (!data?.ok) throw new Error(data?.error || "recs_failed");
        void EventBus.publish({
          topic: "nl.recommendation.generated",
          moduleKey: "natural-living",
          actorUserId: userId,
          payload: { count: (data.items || []).length, cached: !!data.cached },
        });
        void Analytics.track({
          name: "nl_recommendations_generated",
          userId,
          moduleKey: "natural-living",
          props: { count: (data.items || []).length, cached: !!data.cached },
        });
        await load();
      } catch (e: any) {
        setError(e?.message || "Could not refresh recommendations");
      } finally {
        setBusy(false);
      }
    },
    [userId, busy, load],
  );

  const feedback = useCallback(
    async (rec: RecRow, action: "clicked" | "saved" | "dismissed" | "liked" | "disliked", extra?: { rating?: number; comment?: string }) => {
      if (!userId) return;
      await sb.from("nl_recommendation_feedback").insert({
        user_id: userId,
        recommendation_id: rec.id,
        item_type: rec.item_type,
        item_id: rec.item_id ?? rec.item_ref ?? null,
        action,
        rating: extra?.rating ?? null,
        comment: extra?.comment ?? null,
      });
      if (action === "clicked") {
        void EventBus.publish({
          topic: "nl.recommendation.clicked",
          moduleKey: "natural-living",
          actorUserId: userId,
          payload: { rec_id: rec.id, item_type: rec.item_type, title: rec.title },
        });
        void Analytics.track({
          name: "nl_recommendation_clicked",
          userId,
          moduleKey: "natural-living",
          props: { item_type: rec.item_type, rank: rec.rank, score: rec.score },
        });
      }
    },
    [userId],
  );

  return { items, loading, busy, error, load, refresh, feedback };
}
