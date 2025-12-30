import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { Loader2 } from "lucide-react";

interface BuyerOnboardingGuardProps {
  children: ReactNode;
}

/**
 * Guards routes that require buyer context.
 * Redirects buyers without context to onboarding.
 */
const BuyerOnboardingGuard = ({ children }: BuyerOnboardingGuardProps) => {
  const { user, role, loading: authLoading } = useAuth();
  const { hasBuyerContext, loading: contextLoading } = useBuyerContext();

  // Still loading
  if (authLoading || contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - let normal auth flow handle it
  if (!user) {
    return <>{children}</>;
  }

  // Only apply to buyers
  if (role !== "buyer") {
    return <>{children}</>;
  }

  // Buyer without context - redirect to onboarding
  if (!hasBuyerContext) {
    return <Navigate to="/onboarding/buyer" replace />;
  }

  // Buyer has context - allow access
  return <>{children}</>;
};

export default BuyerOnboardingGuard;
