import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  CalendarCheck,
  Hotel,
  Wallet,
  Search,
  Plus,
  Building2,
  ListChecks,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityTimelineEnhanced from "@/components/seller/ActivityTimelineEnhanced";
import BuyExploreCard from "./BuyExploreCard";
import MarketInsightsCard from "./MarketInsightsCard";
import SellTrackPanel from "./SellTrackPanel";

interface Counters {
  favorites: number;
  visits: number;
  bookings: number;
  wallet: number;
}

const EMPTY: Counters = { favorites: 0, visits: 0, bookings: 0, wallet: 0 };

const countOf = async (table: string, column: string, userId: string) => {
  try {
    const { count } = await (supabase as any)
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, userId);
    return count ?? 0;
  } catch {
    return 0;
  }
};

const STAT_STYLES = [
  "text-rose-500",
  "text-emerald-600",
  "text-violet-600",
  "text-amber-500",
];

/** Unified "at a glance" overview for the single Customer profile. */
export default function CustomerOverview({ onNavigateTab }: { onNavigateTab: (view: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counters>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const sb = supabase as any;
      const [favorites, visits, bookings, walletRes] = await Promise.all([
        countOf("favorites", "user_id", user.id),
        countOf("visit_bookings", "buyer_id", user.id),
        countOf("hotel_bookings", "user_id", user.id),
        sb.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!cancelled) {
        setCounts({ favorites, visits, bookings, wallet: Number(walletRes?.data?.balance) || 0 });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = [
    { label: "Saved properties", value: String(counts.favorites), hint: "Your shortlist", icon: Heart, onClick: () => onNavigateTab("buying") },
    { label: "Scheduled visits", value: String(counts.visits), hint: "Site visits booked", icon: CalendarCheck, onClick: () => onNavigateTab("buying") },
    { label: "Hotel bookings", value: String(counts.bookings), hint: "Stays booked", icon: Hotel, onClick: () => onNavigateTab("buying") },
    { label: "Wallet", value: `₹${counts.wallet.toLocaleString("en-IN")}`, hint: "Available balance", icon: Wallet, onClick: () => navigate("/wallet") },
  ];

  const actions = [
    { label: "Search properties", icon: Search, onClick: () => navigate("/search") },
    { label: "List a property", icon: Plus, onClick: () => navigate("/sell-property") },
    { label: "Add a project", icon: Building2, onClick: () => onNavigateTab("builder") },
    { label: "Manage listings", icon: ListChecks, onClick: () => onNavigateTab("selling") },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={s.onClick}
              className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <s.icon className={`h-4 w-4 ${STAT_STYLES[i]}`} />
                {s.label}
              </div>
              <div className={`mt-2 text-3xl font-bold ${STAT_STYLES[i]}`}>{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <a.icon className="h-5 w-5 text-primary" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {user?.id ? (
            <ActivityTimelineEnhanced userId={user.id} />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" /> Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sign in to see your activity.
              </CardContent>
            </Card>
          )}
          <BuyExploreCard onNavigateTab={onNavigateTab} />
        </div>

        <div className="space-y-6">
          <MarketInsightsCard />
          <SellTrackPanel onNavigateTab={onNavigateTab} />
        </div>
      </div>
    </div>
  );
}
