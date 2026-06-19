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
  // Onboarding disabled - always allow access
  return <>{children}</>;
};

export default BuyerOnboardingGuard;
