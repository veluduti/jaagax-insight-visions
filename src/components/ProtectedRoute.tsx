import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AppRole = "buyer" | "agent" | "builder" | "admin" | "customer" | "driver";

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

      // Check if user has the required role (handle buyer/customer mapping)
      const dbRole = allowedRole === 'buyer' ? 'customer' : allowedRole;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", dbRole as any)
        .maybeSingle();

      // Also allow buyer to access if they have customer role
      if (!roleData && allowedRole === 'buyer') {
        const { data: customerRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "customer" as any)
          .maybeSingle();
        setIsAuthorized(!!customerRole);
      } else {
        setIsAuthorized(!!roleData);
      }
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
