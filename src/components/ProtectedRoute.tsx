import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AppRole = "buyer" | "seller" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: AppRole;
}

const isAuthorizedForRole = (role: AppRole | null, allowedRole: AppRole) => {
  if (!role) return false;

  if (allowedRole === "buyer") {
    return role === "buyer" || role === "customer";
  }

  if (allowedRole === "seller") {
    return role === "seller";
  }

  if (allowedRole === "admin") {
    return role === "admin";
  }

  return role === allowedRole;
};

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading, approvalStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!role) {
    if (approvalStatus === "pending") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAuthorizedForRole(role, allowedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
