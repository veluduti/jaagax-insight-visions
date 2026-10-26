import { useEffect, useState } from "react";
import { ShieldCheck, Users, BadgeIndianRupee, Sparkles, MapPinned, Smile, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

const formatCount = (n: number) => {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`;
  return `${n}`;
};

/**
 * Platform statistics strip. Only real database counts are shown as numbers;
 * "Zero Hidden Costs" and "AI-Powered" are product promises, not metrics.
 */
const StatsStrip = () => {
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = supabase as any;
        const [propsRes, agentsRes, usersRes, ratingRes] = await Promise.all([
          sb.from("properties").select("id", { count: "exact", head: true }).eq("verified", true),
          sb.from("agents").select("id", { count: "exact", head: true }),
          sb.from("profiles").select("id", { count: "exact", head: true }),
          sb.from("hotel_reviews").select("rating"),
        ]);

        if (cancelled) return;

        const next: Stat[] = [];
        const props = propsRes?.count ?? 0;
        const agents = agentsRes?.count ?? 0;
        const users = usersRes?.count ?? 0;

        if (props > 0) next.push({ icon: ShieldCheck, value: formatCount(props), label: "Verified Properties" });
        if (agents > 0) next.push({ icon: Users, value: formatCount(agents), label: "Trusted Agents" });
        next.push({ icon: BadgeIndianRupee, value: "Zero", label: "Hidden Costs" });
        next.push({ icon: Sparkles, value: "AI-Powered", label: "Recommendations" });

        // Distinct cities across properties + partner hotels
        let cities = 0;
        try {
          const { data: cityRows } = await sb
            .from("properties")
            .select("city")
            .not("city", "is", null);
          const { data: hotelCities } = await sb
            .from("partner_hotels")
            .select("city")
            .not("city", "is", null);
          const set = new Set<string>();
          [...(cityRows ?? []), ...(hotelCities ?? [])].forEach((r: any) => {
            if (r.city) set.add(String(r.city).trim().toLowerCase());
          });
          cities = set.size;
        } catch {
          cities = 0;
        }
        if (cities > 0) next.push({ icon: MapPinned, value: formatCount(cities), label: "Cities in India" });
        if (users > 0) next.push({ icon: Smile, value: formatCount(users), label: "Happy Customers" });

        const ratings = (ratingRes?.data ?? []) as { rating: number | null }[];
        const valid = ratings.map((r) => r.rating).filter((r): r is number => typeof r === "number" && r > 0);
        if (valid.length > 0) {
          const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
          next.push({ icon: Star, value: `${avg.toFixed(1)}/5`, label: "Average Rating" });
        }

        if (!cancelled) setStats(next);
      } catch {
        // keep whatever we have
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (stats.length === 0) return null;

  return (
    <section className="border-b border-border/50 bg-card">
      <div className="container mx-auto container-padding">
        <div className="flex flex-wrap items-stretch justify-center divide-x divide-border/60">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 px-4 sm:px-6 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base sm:text-lg font-bold text-foreground leading-tight">{s.value}</span>
                  <span className="block text-[11px] sm:text-xs text-muted-foreground">{s.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsStrip;
