import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/components/auth/RequireAuthProvider";
import { Button } from "@/components/ui/button";

type AppRole = "buyer" | "seller" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager" | "financial" | "country_admin" | "state_admin" | "district_admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: AppRole;
}

const isAuthorizedForRole = (role: AppRole | null, allowedRole: AppRole) => {
  if (!role) return false;
  // Unified customer dashboard: buyer, customer and seller all share it
  if (allowedRole === "customer") return role === "buyer" || role === "customer" || role === "seller" || role === "builder";
  if (allowedRole === "buyer") return role === "buyer" || role === "customer";
  if (allowedRole === "seller") return role === "seller" || role === "buyer" || role === "customer";
  if (allowedRole === "admin") return role === "admin";
  return role === allowedRole;
};

const SignInRequiredScreen = ({ message }: { message?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthPopup } = useRequireAuth();

  useEffect(() => {
    openAuthPopup({
      title: "Sign in required",
      message: message || "Please sign in to access this page.",
    });
  }, [openAuthPopup, message]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="text-sm text-muted-foreground">
          {message || "You need to be signed in to access this page. You can keep browsing the rest of the site."}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Button
            className="gap-2"
            onClick={() => navigate("/auth", { state: { from: location.pathname + location.search } })}
          >
            <LogIn className="w-4 h-4" /> Sign in / Sign up
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading, approvalStatus } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <SignInRequiredScreen />;
  }

  if (!role) {
    if (approvalStatus === "pending") {
      return <Navigate to="/dashboard" replace />;
    }
    return <SignInRequiredScreen message="Your account needs to be set up. Please sign in to continue." />;
  }

  if (!isAuthorizedForRole(role, allowedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
