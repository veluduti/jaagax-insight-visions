import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = "free" | "pro" | "agent" | null;

function currentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function usePropertyManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  const [freePostsRemaining, setFreePostsRemaining] = useState<number>(1);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkFreePostsRemaining = useCallback(async (uid: string) => {
    const { count } = await (supabase as any)
      .from("property_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("month_year", currentMonthYear())
      .eq("is_free_post", true);
    const used = count ?? 0;
    return Math.max(0, 1 - used);
  }, []);

  const fetchSubscription = useCallback(async (uid: string): Promise<SubscriptionPlan> => {
    const { data } = await (supabase as any)
      .from("user_subscriptions")
      .select("plan_type, end_date, is_active")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return "free";
    if (data.end_date && new Date(data.end_date) < new Date()) return "free";
    return (data.plan_type as SubscriptionPlan) ?? "free";
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setFreePostsRemaining(0);
      setSubscriptionPlan(null);
      setIsLoading(false);
      return;
    }
    setUserId(user.id);
    const [remaining, plan] = await Promise.all([
      checkFreePostsRemaining(user.id),
      fetchSubscription(user.id),
    ]);
    setFreePostsRemaining(remaining);
    setSubscriptionPlan(plan);
    setIsLoading(false);
  }, [checkFreePostsRemaining, fetchSubscription]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canPostProperty = useCallback(
    async (uid: string): Promise<{ canPost: boolean; reason?: string; needsSubscription?: boolean }> => {
      const plan = await fetchSubscription(uid);
      if (plan === "pro" || plan === "agent") return { canPost: true };
      const remaining = await checkFreePostsRemaining(uid);
      if (remaining > 0) return { canPost: true };
      return { canPost: false, needsSubscription: true, reason: "Free monthly post already used" };
    },
    [checkFreePostsRemaining, fetchSubscription],
  );

  const isSubscribed = subscriptionPlan === "pro" || subscriptionPlan === "agent";

  return {
    userId,
    freePostsRemaining,
    hasUsedFreePost: freePostsRemaining === 0,
    subscriptionPlan,
    isSubscribed,
    isLoading,
    checkFreePostsRemaining,
    canPostProperty,
    refresh,
  };
}
