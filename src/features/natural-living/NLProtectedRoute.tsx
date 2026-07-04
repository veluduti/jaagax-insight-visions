import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useNLAuth, NLRole } from "./useNLAuth";
import { Loader2 } from "lucide-react";

export default function NLProtectedRoute({
  children,
  requireOnboarded = false,
  roles,
}: {
  children: ReactNode;
  requireOnboarded?: boolean;
  roles?: NLRole[];
}) {
  const { user, profile, loading } = useNLAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/natural-living/auth?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (requireOnboarded && (!profile || !profile.onboarding_completed)) {
    return <Navigate to="/natural-living/onboarding" replace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/natural-living/dashboard" replace />;
  }

  return <>{children}</>;
}
