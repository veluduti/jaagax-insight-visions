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

/**
 * Stage names describe the NEXT required action for the user,
 * not the current page. This makes downstream logic (guards,
 * analytics, EventBus payloads) read as explicit workflow states.
 */
export type OnboardingStage =
  | "needs_welcome"      // no state row yet, or welcome not seen
  | "needs_goal"         // welcome done, no goals selected
  | "needs_interview"    // goals selected, no active/completed interview
  | "resume_interview"   // an interview session is in_progress / paused
  | "needs_profile"      // interview complete, no AI profile yet
  | "dashboard_ready";   // profile generated → ready

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
  needs_welcome: "/natural-living/welcome",
  needs_goal: "/natural-living/goals",
  needs_interview: "/natural-living/interview",
  resume_interview: "/natural-living/interview",
  needs_profile: "/natural-living/profile",
  dashboard_ready: "/natural-living/dashboard",
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

  let stage: OnboardingStage = "needs_welcome";

  if (hasProfile) {
    stage = "dashboard_ready";
  } else if (session && session.status === "completed") {
    stage = "needs_profile";
  } else if (session && (session.status === "in_progress" || session.status === "paused")) {
    stage = "resume_interview";
  } else if (hasGoals) {
    stage = "needs_interview";
  } else if (state?.stage && state.stage !== "welcome" && state.last_step) {
    // welcome flagged as completed via state.last_step
    stage = "needs_goal";
  } else {
    stage = "needs_welcome";
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
