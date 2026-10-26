import { useEffect, useState } from "react";
import { ShieldCheck, Users, BadgeIndianRupee, Sparkles, Building2, UsersRound, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: string;
}

const formatCount = (n: number) => {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`;
  return `${n}`;
};

// Icon tones matching the reference design: green, blue, amber, purple, sky.
const TONES = {
  green: "bg-emerald-500/10 text-emerald-600",
  blue: "bg-blue-500/10 text-blue-600",
  amber: "bg-amber-500/10 text-amber-600",
  purple: "bg-purple-500/10 text-purple-600",
  sky: "bg-sky-500/10 text-sky-600",
};

/**
 * Platform statistics strip. Only real database counts are shown as numbers;
 * "Zero Hidden Costs" and "AI-Powered" are product promises, not metrics.
 */
const StatsStrip = () => {
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sb = supabase as any;
        const { data, error } = await sb.rpc("get_platform_stats");
        if (cancelled) return;
        if (error || !data) return;

        const next: Stat[] = [];
        const props = Number(data.verified_properties ?? 0);
        const agents = Number(data.agents ?? 0);
        const users = Number(data.users ?? 0);
        const cities = Number(data.cities ?? 0);

        if (props > 0) next.push({ icon: ShieldCheck, value: formatCount(props), label: "Verified Properties", tone: TONES.green });
        if (agents > 0) next.push({ icon: Users, value: formatCount(agents), label: "Trusted Agents", tone: TONES.blue });
        next.push({ icon: BadgeIndianRupee, value: "Zero", label: "Hidden Costs", tone: TONES.amber });
        next.push({ icon: Sparkles, value: "AI-Powered", label: "Recommendations", tone: TONES.purple });
        if (cities > 0) next.push({ icon: Building2, value: formatCount(cities), label: "Cities in India", tone: TONES.sky });
        if (users > 0) next.push({ icon: UsersRound, value: formatCount(users), label: "Happy Customers", tone: TONES.green });

        const avg = data.avg_rating === null ? null : Number(data.avg_rating);
        const ratingCount = Number(data.rating_count ?? 0);
        if (avg !== null && ratingCount > 0) {
          next.push({ icon: Star, value: `${avg.toFixed(1)}/5`, label: "Average Rating", tone: TONES.amber });
        }

        if (!cancelled) setStats(next);
      } catch {
        // keep whatever we have
      }
    };
    load();
    // Keep counts fresh: refresh every 10s and whenever the tab regains focus.
    const timer = window.setInterval(load, 10_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };

  }, []);

  if (stats.length === 0) return null;

  return (
    <section className="relative z-10 mt-6">
      <div className="container mx-auto container-padding">
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-2 rounded-2xl border border-border/50 bg-card px-2 py-1 shadow-card">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2.5 px-3 py-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                  <Icon className={`h-5 w-5 ${s.icon === ShieldCheck || s.icon === Star ? "fill-current [&>path:last-child]:stroke-card" : ""}`} />
                </span>
                <span>
                  <span className="block text-sm sm:text-base font-bold text-foreground leading-tight">{s.value}</span>
                  <span className="block mt-1 text-[11px] sm:text-xs text-muted-foreground leading-tight">{s.label}</span>
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
