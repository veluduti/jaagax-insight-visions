import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VisitEntitlement {
  free_limit: number;
  free_used: number;
  free_remaining: number;
  paid_enabled: boolean;
  requires_payment: boolean;
  fee: number;
  gst_percent: number;
  gst_amount: number;
  total: number;
  currency: string;
}

export async function fetchVisitEntitlement(userId: string): Promise<VisitEntitlement | null> {
  const { data, error } = await (supabase as any).rpc("get_visit_entitlement", { _user_id: userId });
  if (error) {
    console.error("get_visit_entitlement failed", error);
    return null;
  }
  return data as VisitEntitlement;
}

/**
 * Admin-configured visit booking entitlement: how many free visit schedules the
 * user has left and what a paid visit costs (fee + GST).
 */
export function useVisitEntitlement() {
  const [entitlement, setEntitlement] = useState<VisitEntitlement | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEntitlement(null);
      setLoading(false);
      return;
    }
    setEntitlement(await fetchVisitEntitlement(user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("entitlementsUpdated", onUpdate);
    window.addEventListener("walletUpdated", onUpdate);
    return () => {
      window.removeEventListener("entitlementsUpdated", onUpdate);
      window.removeEventListener("walletUpdated", onUpdate);
    };
  }, [refresh]);

  return { entitlement, loading, refresh };
}
