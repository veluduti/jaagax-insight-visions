/**
 * NLStart — Single Onboarding Entry Point
 * ---------------------------------------
 * Route: /natural-living/start
 *
 * Renders no visible UI beyond a loading indicator. Decides where the
 * user should land based on:
 *   - authentication state
 *   - onboarding stage (welcome / goals / interview / profile / dashboard)
 *   - active interview session (resume support)
 *
 * All landing-page CTAs and onboarding entrypoints funnel through here.
 */
import { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  ProfileBootProvider,
  useProfileBoot,
} from "@/features/natural-living/onboarding/ProfileBootProvider";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";

function NLStartInner() {
  const { loading, user, snapshot, error } = useProfileBoot();
  const navigate = useNavigate();
  const location = useLocation();
  const visitedRef = useRef(false);

  // Preserve incoming query (e.g. ?goal=return-to-farming) forward.
  const forwardSearch = location.search || "";

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    void EventBus.publish({
      topic: "nl.onboarding.start_visited",
      moduleKey: "natural-living",
      actorUserId: user?.id ?? null,
      payload: { authed: !!user, search: forwardSearch },
    });
    void Analytics.track({
      name: "nl_start_visited",
      userId: user?.id ?? null,
      moduleKey: "natural-living",
      props: { authed: !!user },
    });
  }, [user, forwardSearch]);

  useEffect(() => {
    if (loading) return;
    if (!user || !snapshot) return;
    void EventBus.publish({
      topic: "nl.onboarding.redirect",
      moduleKey: "natural-living",
      actorUserId: user.id,
      payload: { stage: snapshot.stage, nextRoute: snapshot.nextRoute },
    });
    void Analytics.track({
      name: "nl_onboarding_redirect",
      userId: user.id,
      moduleKey: "natural-living",
      props: { stage: snapshot.stage, next: snapshot.nextRoute },
    });
  }, [loading, user, snapshot]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--nl-cream))]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  if (error) {
    // Corrupted / offline state — fall back to auth so user can retry.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[hsl(var(--nl-cream))] p-8 text-center">
        <p className="text-[hsl(var(--nl-ink))] max-w-md">
          We couldn't load your onboarding state. Please check your connection and try again.
        </p>
        <button
          className="nl-btn nl-btn-primary"
          onClick={() => navigate("/natural-living", { replace: true })}
        >
          Back to Natural Living
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/natural-living/auth?next=${encodeURIComponent("/natural-living/start" + forwardSearch)}`}
        replace
      />
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--nl-cream))]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  return <Navigate to={snapshot.nextRoute + forwardSearch} replace />;
}
