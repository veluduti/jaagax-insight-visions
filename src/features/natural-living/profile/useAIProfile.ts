/**
 * useAIProfile — loads / generates / regenerates the user's Natural Living
 * AI Profile via the `nl-profile-generator` edge function, and lists version
 * history from `nl_ai_profile_versions`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import * as Timeline from "@/platform/timeline/timeline";

const sb = supabase as any;

export interface ScoreEntry {
  value: number;
  confidence: number;
  explanation: string;
}
export interface AIProfileRow {
  id: string;
  user_id: string;
  session_id: string | null;
  persona: string | null;
  summary: string | null;
  scores: Record<string, ScoreEntry>;
  tags: string[];
  strengths: string[];
  risks: string[];
  readiness_score: number | null;
  risk_score: number | null;
  intent_score: number | null;
  raw_output: any;
  model: string | null;
  version: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}
export interface ProfileVersionRow {
  id: string;
  profile_id: string;
  user_id: string;
  version: number;
  snapshot: any;
  reason: string | null;
  created_at: string;
}

export function useAIProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<AIProfileRow | null>(null);
  const [versions, setVersions] = useState<ProfileVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, vRes] = await Promise.all([
        sb.from("nl_ai_profiles").select("*").eq("user_id", userId).order("version", { ascending: false }).limit(1).maybeSingle(),
        sb.from("nl_ai_profile_versions").select("*").eq("user_id", userId).order("version", { ascending: false }),
      ]);
      if (pRes.error) throw pRes.error;
      setProfile(pRes.data ?? null);
      setVersions(vRes.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const generate = useCallback(
    async (reason: "initial" | "regenerate" | "edit" = "initial") => {
      if (!userId || busy) return null;
      setBusy(true);
      setError(null);
      try {
        const { data, error: fnError } = await (supabase.functions as any).invoke("nl-profile-generator", {
          body: { reason },
        });
        if (fnError) throw fnError;
        if (!data?.ok) throw new Error(data?.error || "generation_failed");
        const topic =
          reason === "initial"
            ? "nl.profile.generated"
            : reason === "regenerate"
              ? "nl.profile.regenerated"
              : "nl.profile.updated";
        void EventBus.publish({
          topic,
          moduleKey: "natural-living",
          actorUserId: userId,
          payload: { profile_id: data.profileId, version: data.version, reason },
        });
        void Analytics.track({
          name: "nl_profile_generated",
          userId,
          moduleKey: "natural-living",
          props: { version: data.version, reason },
        });
        void Timeline.record({
          actorUserId: userId,
          moduleKey: "natural-living",
          action: reason === "initial" ? "profile_created" : "profile_regenerated",
          subjectType: "nl_ai_profile",
          subjectId: data.profileId,
          meta: { version: data.version },
        });
        await load();
        return data;
      } catch (e: any) {
        setError(e?.message || "Could not generate profile");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [userId, busy, load],
  );

  return { profile, versions, loading, busy, error, load, generate };
}
