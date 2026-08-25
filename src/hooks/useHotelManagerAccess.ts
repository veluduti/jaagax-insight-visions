import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tells whether the currently signed-in user also holds an active/approved
 * hotel_manager role, so the UI can offer a Hotel Dashboard switch.
 * Read-only: does not change roles or any existing permission logic.
 */
export function useHotelManagerAccess() {
  const [loading, setLoading] = useState(true);
  const [isHotelManager, setIsHotelManager] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) { setIsHotelManager(false); setLoading(false); }
        return;
      }
      const [roles, app, profileRows] = await Promise.all([
        (supabase as any).from("user_roles").select("role").eq("user_id", userId),
        (supabase as any)
          .from("hotel_partner_applications")
          .select("status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any).from("profiles").select("type,status").eq("user_id", userId),
      ]);

      const hasRole = ((roles?.data ?? []) as any[]).some(
        (r) => r.role === "hotel_manager" || r.role === "hotel"
      );
      const hasProfile = ((profileRows?.data ?? []) as any[]).some(
        (p) => (p.type === "hotel_manager" || p.type === "hotel") && p.status === "active"
      );
      const approvedApp = app?.data?.status === "approved";

      if (!cancelled) {
        setIsHotelManager(hasRole || hasProfile || approvedApp);
        setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => check(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoading(true);
      void check(session?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return { loading, isHotelManager };
}

export default useHotelManagerAccess;
