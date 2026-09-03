import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { agentPublicLabel, agentAvatarInitials, agentLanguages } from "@/lib/agentPrivacy";
import { cn } from "@/lib/utils";

interface NearbyAgentsRailProps {
  /** Optional city to bias the agent list */
  city?: string | null;
  className?: string;
}

/**
 * Slim vertical rail of nearby verified agents.
 * Names are never shown — only public agent codes (see agentPrivacy).
 */
export default function NearbyAgentsRail({ city, className }: NearbyAgentsRailProps) {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("agents")
          .select(
            "id, agent_code, photo_url, trust_score, sales_count, verified, cities_served, languages, languages_spoken",
          )
          .eq("verified", true)
          .order("trust_score", { ascending: false })
          .limit(12);

        if (city) query = query.ilike("cities_served", `%${city}%`);

        let { data, error } = await query;
        if (error) throw error;

        // Fallback to any verified agents when the city filter yields nothing
        if ((!data || data.length === 0) && city) {
          const fallback = await supabase
            .from("agents")
            .select(
              "id, agent_code, photo_url, trust_score, sales_count, verified, cities_served, languages, languages_spoken",
            )
            .eq("verified", true)
            .order("trust_score", { ascending: false })
            .limit(12);
          data = fallback.data || [];
        }

        if (!cancelled) setAgents(data || []);
      } catch (e) {
        console.error("NearbyAgentsRail:", e);
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city]);

  if (!loading && agents.length === 0) return null;

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Nearby agents
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {city ? `Verified experts near ${city}` : "Verified JAAGA experts"}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <div className="flex flex-col gap-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            : agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => navigate(`/agent/${agent.id}`)}
                  className="group flex items-start gap-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/60 px-2.5 py-2 text-left transition-all shrink-0"
                >
                  <Avatar className="h-9 w-9 ring-1 ring-primary/20">
                    <AvatarImage src={agent.photo_url || ""} alt={agentPublicLabel(agent)} />
                    <AvatarFallback className="text-[10px]">
                      {agentAvatarInitials(agent)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1">
                      <span className="block text-xs font-semibold font-mono tracking-wide truncate">
                        {agentPublicLabel(agent)}
                      </span>
                      {agent.verified && (
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <Shield className="h-3 w-3" />
                        {agent.trust_score ?? 75}
                      </span>
                      <span>{agent.sales_count || 0} sales</span>
                    </span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {agentLanguages(agent).slice(0, 3).join(", ") || "English"}
                    </span>
                  </span>
                </button>
              ))}
        </div>
      </div>

      <div className="px-3 py-2.5 shrink-0 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs h-8"
          onClick={() => navigate("/agents")}
        >
          View more agents
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
