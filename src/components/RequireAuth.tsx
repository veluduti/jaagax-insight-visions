import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Any signed-in user; otherwise redirect to sign-in and come back afterwards. */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) {
    const from = loc.pathname + loc.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(from)}`} state={{ from }} replace />;
  }
  return <>{children}</>;
}
