import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ensureApprovedRoleForUser, resolveUserAccess } from "@/lib/authRoleResolver";

type AppRole = "buyer" | "seller" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: AppRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    void checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void checkAuth(session?.user?.id, session?.user?.email);
      }, 0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [allowedRole]);

  const checkAuth = async (sessionUserId?: string, sessionEmail?: string | null) => {
    setLoading(true);

    try {
      let userId = sessionUserId;
      let email = sessionEmail;

      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        userId = session.user.id;
        email = session.user.email;
      }

      const access = await resolveUserAccess(userId, email);

      if (access.approvalStatus === "approved" && !access.hasAssignedRole && access.requestedRole) {
        await ensureApprovedRoleForUser(userId, access.requestedRole);
      }

      const hasRole = allowedRole === "admin"
        ? access.resolvedDbRole === "admin"
        : allowedRole === "buyer"
          ? access.resolvedRole === "buyer" || access.resolvedRole === "customer"
          : allowedRole === "seller"
            ? access.resolvedRole === "seller" || access.resolvedDbRole === "customer"
            : access.resolvedRole === allowedRole;

      setIsAuthorized(Boolean(hasRole));
    } catch (error) {
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
