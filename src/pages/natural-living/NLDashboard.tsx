/**
 * NLDashboard — /natural-living/dashboard
 *
 * Personalized dashboard rendered once the user has a generated AI Profile.
 * Uses shared platform DashboardShell for widget composition (via the
 * registered widgets in `dashboard/registerWidgets.ts`), plus a hero
 * greeting and the recommendations grid.
 */
import { useEffect } from "react";
import { ProfileBootProvider, useProfileBoot } from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import { DashboardShell } from "@/platform/dashboard/DashboardShell";
import { NLGreetingHero, NLRecommendationsGrid } from "@/features/natural-living/dashboard/widgets";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import "@/features/natural-living/theme.css";
import "@/features/natural-living/dashboard/registerWidgets";

function DashboardBody() {
  const { user } = useProfileBoot();
  useEffect(() => {
    if (!user) return;
    void EventBus.publish({
      topic: "nl.dashboard.viewed",
      moduleKey: "natural-living",
      actorUserId: user.id,
    });
    void Analytics.track({
      name: "nl_dashboard_viewed",
      userId: user.id,
      moduleKey: "natural-living",
    });
  }, [user]);

  return (
    <div
      className="nl-scope min-h-screen"
      style={{ background: "hsl(var(--nl-cream))" }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <NLGreetingHero />
        <DashboardShell audience="nl_user" />
        <NLRecommendationsGrid />
      </div>
    </div>
  );
}

export default function NLDashboard() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth allowStages={["dashboard_ready"]}>
        <DashboardBody />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
