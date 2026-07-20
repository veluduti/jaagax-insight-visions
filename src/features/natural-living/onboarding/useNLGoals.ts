/**
 * useNLGoals
 * ----------
 * Loads active goals from `nl_goals` and the current user's existing
 * selections from `nl_user_goals`, and exposes a `saveSelection` upsert
 * that avoids duplicates.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GoalCardData } from "./GoalCard";

const sb = supabase as any;

export interface NLGoal extends GoalCardData {
  sort_order: number;
}

export function useNLGoals(userId?: string | null) {
  const [goals, setGoals] = useState<NLGoal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const goalsRes = await sb
          .from("nl_goals")
          .select("id, code, title, subtitle, description, category, icon, sort_order, metadata")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true, nullsFirst: false });
        if (goalsRes.error) throw goalsRes.error;

        const list: NLGoal[] = (goalsRes.data || []).map((g: any) => ({
          id: g.id,
          code: g.code,
          title: g.title,
          subtitle: g.subtitle,
          description: g.description,
          category: g.category,
          icon: g.icon,
          sort_order: g.sort_order ?? 999,
          popular: !!(g.metadata && (g.metadata.popular === true || g.metadata.popularity === "high")),
        }));

        let selected: string[] = [];
        if (userId) {
          const selRes = await sb
            .from("nl_user_goals")
            .select("goal_id")
            .eq("user_id", userId);
          if (selRes.error) throw selRes.error;
          selected = (selRes.data || []).map((r: any) => r.goal_id);
        }

        if (!cancelled) {
          setGoals(list);
          setSelectedIds(selected);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load goals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveSelection = useCallback(
    async (uid: string, ids: string[]) => {
      // Replace-set semantics: remove ones no longer selected, insert only new ones.
      const existingRes = await sb
        .from("nl_user_goals")
        .select("id, goal_id")
        .eq("user_id", uid);
      if (existingRes.error) throw existingRes.error;
      const existing: Array<{ id: string; goal_id: string }> = existingRes.data || [];
      const existingGoalIds = new Set(existing.map((r) => r.goal_id));
      const desired = new Set(ids);

      const toDelete = existing.filter((r) => !desired.has(r.goal_id)).map((r) => r.id);
      const toInsert = ids
        .filter((id) => !existingGoalIds.has(id))
        .map((goal_id, idx) => ({
          user_id: uid,
          goal_id,
          priority: idx + 1,
        }));

      if (toDelete.length) {
        const delRes = await sb.from("nl_user_goals").delete().in("id", toDelete);
        if (delRes.error) throw delRes.error;
      }
      if (toInsert.length) {
        const insRes = await sb.from("nl_user_goals").insert(toInsert);
        if (insRes.error) throw insRes.error;
      }
    },
    [],
  );

  return { goals, selectedIds, setSelectedIds, loading, error, saveSelection };
}
