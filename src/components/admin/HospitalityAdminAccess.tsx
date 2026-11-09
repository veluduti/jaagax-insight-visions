import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

export default function HospitalityAdminAccess({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [scoped, setScoped] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    if (!user) { setScoped(false); return; }
    setScoped(null);
    supabase.rpc("can_manage_hyperguest", { _user_id: user.id }).then(({ data }) => { if (active) setScoped(data === true); });
    return () => { active = false; };
  }, [user?.id]);
  if (loading || scoped === null) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  return scoped ? <>{children}</> : <ProtectedRoute allowedRole="admin">{children}</ProtectedRoute>;
}