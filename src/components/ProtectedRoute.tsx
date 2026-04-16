import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AppRole = "buyer" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: AppRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => checkAuth(), 0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [allowedRole]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // For admin role, check directly
      if (allowedRole === 'admin') {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAuthorized(!!roleData);
        setLoading(false);
        return;
      }

      // Map buyer to customer for DB lookup
      const rolesToCheck = allowedRole === 'buyer' 
        ? ['customer', 'buyer'] 
        : [allowedRole];

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      let hasRole = roleData?.some(r => rolesToCheck.includes(r.role as any));

      if (!hasRole) {
        const { data: signupData } = await supabase
          .from("signup_requests")
          .select("requested_role, status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        hasRole = !!signupData && signupData.status === "approved" && rolesToCheck.includes(signupData.requested_role as any);
      }

      setIsAuthorized(!!hasRole);
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
