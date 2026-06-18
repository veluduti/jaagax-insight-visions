import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityType = "search" | "visit" | "posting" | "wallet" | "enquiry" | "favorite" | "view";

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ActivityFilters {
  type?: ActivityType | "all";
  range?: "today" | "week" | "month" | "year" | "all" | "custom";
  from?: string;
  to?: string;
}

export interface ActivityInsights {
  viewsThisWeek: number;
  favoritesCount: number;
  walletSpentMonth: number;
  visitsByCity: Record<string, number>;
  totalSearches: number;
  topCity: string | null;
  bullets: string[];
}

function rangeToDate(range?: ActivityFilters["range"], from?: string): string | null {
  const now = new Date();
  switch (range) {
    case "today": now.setHours(0, 0, 0, 0); return now.toISOString();
    case "week": now.setDate(now.getDate() - 7); return now.toISOString();
    case "month": now.setMonth(now.getMonth() - 1); return now.toISOString();
    case "year": now.setFullYear(now.getFullYear() - 1); return now.toISOString();
    case "custom": return from || null;
    default: return null;
  }
}

export function useActivity() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [insights, setInsights] = useState<ActivityInsights | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({ type: "all", range: "all" });
  const PAGE_SIZE = 20;

  const logActivity = useCallback(
    async (type: ActivityType, description: string, metadata: Record<string, any> = {}) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any).from("user_activities").insert({
        user_id: user.id,
        activity_type: type,
        description,
        metadata,
      });
    },
    [],
  );

  const fetchPage = useCallback(
    async (page = 0, replace = true, currentFilters: ActivityFilters = filters) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      let q = (supabase as any)
        .from("user_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (currentFilters.type && currentFilters.type !== "all") {
        q = q.eq("activity_type", currentFilters.type);
      }
      const fromDate = rangeToDate(currentFilters.range, currentFilters.from);
      if (fromDate) q = q.gte("created_at", fromDate);
      if (currentFilters.range === "custom" && currentFilters.to) q = q.lte("created_at", currentFilters.to);

      const { data, error } = await q;
      if (error) { setIsLoading(false); return; }
      const rows = (data as UserActivity[]) || [];
      setHasMore(rows.length === PAGE_SIZE);
      setActivities((prev) => (replace ? rows : [...prev, ...rows]));
      setIsLoading(false);
    },
    [filters],
  );

  const computeInsights = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const since7 = new Date(); since7.setDate(since7.getDate() - 7);
    const since30 = new Date(); since30.setMonth(since30.getMonth() - 1);

    const [{ data: viewsW }, { data: favs }, { data: walletM }, { data: visits }, { data: searches }] = await Promise.all([
      (supabase as any).from("user_activities").select("id").eq("user_id", user.id)
        .in("activity_type", ["view", "visit"]).gte("created_at", since7.toISOString()),
      (supabase as any).from("favorites").select("id").eq("user_id", user.id),
      (supabase as any).from("wallet_transactions").select("amount").eq("user_id", user.id)
        .eq("type", "debit").gte("created_at", since30.toISOString()),
      (supabase as any).from("user_activities").select("metadata").eq("user_id", user.id)
        .eq("activity_type", "visit").gte("created_at", since30.toISOString()),
      (supabase as any).from("user_activities").select("id").eq("user_id", user.id)
        .eq("activity_type", "search"),
    ]);

    const visitsByCity: Record<string, number> = {};
    (visits || []).forEach((v: any) => {
      const c = v?.metadata?.city || v?.metadata?.location;
      if (c) visitsByCity[c] = (visitsByCity[c] || 0) + 1;
    });
    const topCity = Object.entries(visitsByCity).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const walletSpent = (walletM || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const viewsThisWeek = (viewsW || []).length;
    const favoritesCount = (favs || []).length;
    const totalSearches = (searches || []).length;

    const bullets: string[] = [];
    if (viewsThisWeek > 0) bullets.push(`You've viewed ${viewsThisWeek} ${viewsThisWeek === 1 ? "property" : "properties"} this week.`);
    if (favoritesCount > 0) bullets.push(`You've saved ${favoritesCount} ${favoritesCount === 1 ? "property" : "properties"} to favorites.`);
    if (walletSpent > 0) bullets.push(`You've spent ₹${walletSpent.toLocaleString("en-IN")} from your wallet this month.`);
    if (topCity) bullets.push(`You've visited ${visitsByCity[topCity]} ${visitsByCity[topCity] === 1 ? "property" : "properties"} in ${topCity}.`);
    if (totalSearches > 0) bullets.push(`You've run ${totalSearches} ${totalSearches === 1 ? "search" : "searches"} so far.`);
    if (bullets.length === 0) bullets.push("Start exploring properties — your insights will appear here.");

    setInsights({ viewsThisWeek, favoritesCount, walletSpentMonth: walletSpent, visitsByCity, totalSearches, topCity, bullets });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchPage(0, true, filters), computeInsights()]);
  }, [fetchPage, computeInsights, filters]);

  const loadMore = useCallback(async () => {
    const nextPage = Math.floor(activities.length / PAGE_SIZE);
    await fetchPage(nextPage, false, filters);
  }, [activities.length, fetchPage, filters]);

  const applyFilters = useCallback(async (f: ActivityFilters) => {
    setFilters(f);
    setIsLoading(true);
    await fetchPage(0, true, f);
  }, [fetchPage]);

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  // realtime
  useEffect(() => {
    let chan: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      chan = supabase
        .channel("user_activities:" + user.id)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "user_activities", filter: `user_id=eq.${user.id}` },
          () => refresh())
        .subscribe();
    })();
    return () => { if (chan) supabase.removeChannel(chan); };
  }, [refresh]);

  return { activities, isLoading, hasMore, insights, filters, applyFilters, loadMore, refresh, logActivity };
}
