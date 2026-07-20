/**
 * Onboarding Stage Resolver
 * -------------------------
 * Reads onboarding state, active interview session, and AI profile
 * for a user and computes the correct next route within the Natural
 * Living onboarding funnel.
 *
 * This is a pure data layer — no React, no side effects beyond
 * Supabase reads — so it can be reused by the /start router, the
 * auth guard, and analytics.
 */
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStage =
  | "welcome"        // no state row yet, or welcome not seen
  | "goals"          // welcome done, no goals selected
  | "interview"      // goals selected, no active/completed interview
  | "interview_resume" // an interview session is in_progress
  | "profile"        // interview complete, no AI profile yet
  | "dashboard";     // profile generated → ready

export interface OnboardingSnapshot {
  stage: OnboardingStage;
  nextRoute: string;
  state: {
    id: string;
    stage: string | null;
    progress_pct: number | null;
    last_step: string | null;
    completed_at: string | null;
  } | null;
  activeInterview: {
    id: string;
    status: string | null;
    progress_pct: number | null;
    current_question_code: string | null;
  } | null;
  hasProfile: boolean;
  hasGoals: boolean;
}

const ROUTES: Record<OnboardingStage, string> = {
  welcome: "/natural-living/welcome",
  goals: "/natural-living/goals",
  interview: "/natural-living/interview",
  interview_resume: "/natural-living/interview",
  profile: "/natural-living/profile",
  dashboard: "/natural-living/dashboard",
};

const sb = supabase as any;

export async function resolveOnboarding(userId: string): Promise<OnboardingSnapshot> {
  const [stateRes, goalsRes, sessionRes, profileRes] = await Promise.all([
    sb
      .from("nl_onboarding_state")
      .select("id, stage, progress_pct, last_step, completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("nl_user_goals").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb
      .from("nl_interview_sessions")
      .select("id, status, progress_pct, current_question_code, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("nl_ai_profiles")
      .select("id")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const state = stateRes.data ?? null;
  const goalsCount = (goalsRes as any)?.count ?? 0;
  const session = sessionRes.data ?? null;
  const hasProfile = !!profileRes.data;
  const hasGoals = goalsCount > 0;

  let stage: OnboardingStage = "welcome";

  if (hasProfile) {
    stage = "dashboard";
  } else if (session && session.status === "completed") {
    stage = "profile";
  } else if (session && (session.status === "in_progress" || session.status === "paused")) {
    stage = "interview_resume";
  } else if (hasGoals) {
    stage = "interview";
  } else if (state?.stage && state.stage !== "welcome" && state.last_step) {
    // welcome flagged as completed via state.last_step
    stage = "goals";
  } else {
    stage = "welcome";
  }

  return {
    stage,
    nextRoute: ROUTES[stage],
    state,
    activeInterview: session,
    hasProfile,
    hasGoals,
  };
}

export const ONBOARDING_ROUTES = ROUTES;
