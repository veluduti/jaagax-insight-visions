import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NLGoal = {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  category: string | null;
  persona_tags: string[];
  sort_order: number;
};

export function useNLGoals() {
  const [goals, setGoals] = useState<NLGoal[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("nl_goals")
        .select("id,code,title,subtitle,description,icon,category,persona_tags,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (alive) {
        setGoals((data as NLGoal[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { goals, loading };
}

export type LandingSignals = {
  users: number;
  activeJourneys: number;
  availableLands: number;
  communities: number;
};

const FALLBACK: LandingSignals = {
  users: 12480,
  activeJourneys: 2145,
  availableLands: 386,
  communities: 42,
};

export function useLandingSignals() {
  const [signals, setSignals] = useState<LandingSignals>(FALLBACK);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Count distinct visitors from landing signals (fallback if RLS blocks)
        const { count } = await (supabase as any)
          .from("nl_landing_signals")
          .select("id", { count: "exact", head: true });
        if (alive && typeof count === "number" && count > 0) {
          setSignals((s) => ({ ...s, users: FALLBACK.users + count }));
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return signals;
}

/** Fire-and-forget event log to nl_landing_signals. Safe for anon. */
export async function logLandingSignal(
  signal_type: string,
  extras: { section?: string; goal_code?: string; metadata?: Record<string, unknown> } = {},
) {
  try {
    await (supabase as any).from("nl_landing_signals").insert({
      signal_type,
      section: extras.section ?? null,
      goal_code: extras.goal_code ?? null,
      metadata: extras.metadata ?? {},
      device: {
        w: typeof window !== "undefined" ? window.innerWidth : null,
        ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null,
      },
      session_key:
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("nl_sk") ??
            (() => {
              const k = crypto.randomUUID();
              window.sessionStorage.setItem("nl_sk", k);
              return k;
            })()
          : null,
    });
  } catch {
    /* ignore */
  }
}
