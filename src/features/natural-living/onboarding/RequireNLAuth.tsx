/**
 * Authentication + Onboarding Guard
 * ---------------------------------
 * Wraps future onboarding, profile, and dashboard pages.
 * - Guests → /natural-living/auth?next=<current>
 * - Authenticated but on wrong onboarding stage → /natural-living/start
 * - Correct stage → render children
 *
 * `allowStages` lets a page opt into the specific stages that may
 * render it. Omit it to allow any authenticated user through.
 */
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useProfileBoot } from "./ProfileBootProvider";
import type { OnboardingStage } from "./resolveOnboarding";

export default function RequireNLAuth({
  children,
  allowStages,
  requireVerified = false,
}: {
  children: ReactNode;
  allowStages?: OnboardingStage[];
  requireVerified?: boolean;
}) {
  const { loading, user, snapshot, verified } = useProfileBoot();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/natural-living/auth?next=${next}`} replace />;
  }

  if (requireVerified && !verified) {
    return <Navigate to="/natural-living/auth?verify=1" replace />;
  }

  if (allowStages && snapshot && !allowStages.includes(snapshot.stage)) {
    return <Navigate to="/natural-living/start" replace />;
  }

  return <>{children}</>;
}
