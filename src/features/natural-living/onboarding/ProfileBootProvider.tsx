/**
 * Profile Boot Provider
 * ---------------------
 * Single source of truth for Natural Living onboarding routing.
 *
 * Determines, for the current user:
 *   - is the session valid?
 *   - is email verified?
 *   - what onboarding stage are they on?
 *   - is there an active interview to resume?
 *   - has a profile been generated?
 *
 * Consumers: `NLStart` (routes intelligently) and `RequireNLAuth`
 * (protects future onboarding & dashboard pages).
 */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveOnboarding, OnboardingSnapshot } from "./resolveOnboarding";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";

export interface ProfileBootValue {
  loading: boolean;
  user: User | null;
  verified: boolean;
  snapshot: OnboardingSnapshot | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ProfileBootValue | null>(null);

export function ProfileBootProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedUser = useRef<string | null>(null);

  const load = useCallback(async (u: User | null) => {
    if (!u) {
      setSnapshot(null);
      lastLoadedUser.current = null;
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await resolveOnboarding(u.id);
      setSnapshot(snap);
      lastLoadedUser.current = u.id;
    } catch (e: any) {
      setError(e?.message || "Failed to load onboarding state");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      if (!mounted) return;
      setUser(u);

      // Defer supabase calls out of the callback (per docs).
      setTimeout(() => {
        if (!mounted) return;
        void load(u);
      }, 0);

      // Emit lifecycle events on transitions.
      if (event === "SIGNED_IN" && u) {
        void EventBus.publish({
          topic: "nl.auth.signed_in",
          actorUserId: u.id,
          moduleKey: "natural-living",
          payload: { email: u.email },
        });
        void Analytics.track({
          name: "nl_auth_signed_in",
          props: { provider: u.app_metadata?.provider ?? "email" },
          userId: u.id,
          moduleKey: "natural-living",
        });
      } else if (event === "SIGNED_OUT") {
        void EventBus.publish({
          topic: "nl.auth.signed_out",
          moduleKey: "natural-living",
        });
        void Analytics.track({ name: "nl_auth_signed_out", moduleKey: "natural-living" });
      } else if (event === "TOKEN_REFRESHED" && u && lastLoadedUser.current !== u.id) {
        void EventBus.publish({
          topic: "nl.auth.session_restored",
          actorUserId: u.id,
          moduleKey: "natural-living",
        });
      } else if (event === "USER_UPDATED" && u?.email_confirmed_at) {
        void EventBus.publish({
          topic: "nl.auth.verified",
          actorUserId: u.id,
          moduleKey: "natural-living",
        });
        void Analytics.track({ name: "nl_auth_verified", userId: u.id, moduleKey: "natural-living" });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      void load(u);
      if (u) {
        void EventBus.publish({
          topic: "nl.auth.session_restored",
          actorUserId: u.id,
          moduleKey: "natural-living",
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    if (user) await load(user);
  }, [user, load]);

  const value = useMemo<ProfileBootValue>(
    () => ({
      loading,
      user,
      verified: !!user?.email_confirmed_at || user?.app_metadata?.provider !== "email",
      snapshot,
      error,
      refresh,
    }),
    [loading, user, snapshot, error, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfileBoot(): ProfileBootValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useProfileBoot must be used within <ProfileBootProvider>");
  }
  return v;
}
