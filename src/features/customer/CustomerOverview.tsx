import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  CalendarCheck,
  Home,
  Building2,
  Hotel,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityTimelineEnhanced from "@/components/seller/ActivityTimelineEnhanced";

interface Counters {
  favorites: number;
  visits: number;
  bookings: number;
  listings: number;
  projects: number;
}

const EMPTY: Counters = { favorites: 0, visits: 0, bookings: 0, listings: 0, projects: 0 };

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

interface TileProps {
  label: string;
  value: number;
  icon: any;
  onClick: () => void;
}

const Tile = ({ label, value, icon: Icon, onClick }: TileProps) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
  >
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="mt-2 text-2xl font-bold">{value}</div>
  </button>
);

/**
 * Unified "at a glance" view across the buying, selling and builder sides
 * of the single Customer profile.
 */
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
      const [favorites, visits, bookings, listings, projects] = await Promise.all([
        countOf("favorites", "user_id", user.id),
        countOf("visits", "buyer_id", user.id),
        countOf("hotel_bookings", "user_id", user.id),
        countOf("properties", "submitted_by", user.id),
        countOf("projects", "submitted_by", user.id),
      ]);
      if (!cancelled) {
        setCounts({ favorites, visits, bookings, listings, projects });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Your activity at a glance</h2>
        <p className="text-sm text-muted-foreground">
          Buying, selling and building — all under one Customer profile.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Tile label="Saved properties" value={counts.favorites} icon={Heart} onClick={() => onNavigateTab("buying")} />
          <Tile label="Scheduled visits" value={counts.visits} icon={CalendarCheck} onClick={() => onNavigateTab("buying")} />
          <Tile label="Hotel bookings" value={counts.bookings} icon={Hotel} onClick={() => onNavigateTab("buying")} />
          <Tile label="My listings" value={counts.listings} icon={Home} onClick={() => onNavigateTab("selling")} />
          <Tile label="Projects" value={counts.projects} icon={Building2} onClick={() => onNavigateTab("builder")} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>Jump straight into what you want to do next</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/search")}>
            <Search className="h-4 w-4" /> Search properties
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/sell-property")}>
            <Plus className="h-4 w-4" /> List a property
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => onNavigateTab("builder")}>
            <Building2 className="h-4 w-4" /> Add a project
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => onNavigateTab("selling")}>
            Manage listings <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {user?.id && <ActivityTimelineEnhanced userId={user.id} />}
    </div>
  );
}
