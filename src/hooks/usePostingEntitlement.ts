import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PostingEntitlement {
  free_limit: number;
  free_used: number;
  free_remaining: number;
  has_agent_subscription: boolean;
  pay_per_post_enabled: boolean;
  requires_payment: boolean;
  fee: number;
  gst_percent: number;
  gst_amount: number;
  total: number;
  currency: string;
}

export async function fetchPostingEntitlement(userId: string): Promise<PostingEntitlement | null> {
  const { data, error } = await (supabase as any).rpc("get_posting_entitlement", { _user_id: userId });
  if (error) {
    console.error("get_posting_entitlement failed", error);
    return null;
  }
  return data as PostingEntitlement;
}

/**
 * Reads the admin-configured posting entitlement for the signed-in user:
 * free posts left, pay-per-post price (fee + GST) and agent-subscription status.
 */
export function usePostingEntitlement() {
  const [entitlement, setEntitlement] = useState<PostingEntitlement | null>(null);
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
    setEntitlement(await fetchPostingEntitlement(user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entitlement, loading, refresh };
}
