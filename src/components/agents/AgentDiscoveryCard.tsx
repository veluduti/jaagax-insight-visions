import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  agentPublicLabel,
  agentAvatarInitials,
} from "@/lib/agentPrivacy";
import {
  deriveBadge,
  propertiesHandled,
  toArray,
  type DiscoveryAgent,
} from "@/lib/agentDiscovery";
import {
  BadgeCheck,
  Building2,
  Heart,
  MapPin,
  MessageCircle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  "Top Rated": "bg-primary text-primary-foreground",
  Verified: "bg-primary text-primary-foreground",
  Experienced: "bg-accent text-accent-foreground",
  "Rising Star": "bg-secondary text-secondary-foreground",
};

interface Props {
  agent: DiscoveryAgent;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (agent: DiscoveryAgent) => void;
  onContact: (agent: DiscoveryAgent) => void;
  compact?: boolean;
}

const AgentDiscoveryCard = ({ agent, index, isFavorite, onToggleFavorite, onContact, compact = false }: Props) => {
  const navigate = useNavigate();
  const badge = deriveBadge(agent);
  const rating = Number(agent.avg_rating || 0);
  const ratings = agent.total_ratings || 0;
  const specs = (agent.specializations || []).filter(Boolean).slice(0, compact ? 3 : 4);
  const location =
    toArray(agent.cities_served)[0] ||
    [agent.city, agent.state].filter(Boolean).join(", ") ||
    "Location not set";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
    >
      <Card className="overflow-hidden border-border bg-card hover:shadow-lg transition-shadow">
        {/* Photo header */}
        <div className={cn("relative bg-muted", compact ? "h-16" : "h-32")}>
          {agent.photo_url ? (
            <img
              src={agent.photo_url}
              alt={agentPublicLabel(agent)}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span
                className={cn(
                  "flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
                  compact ? "h-9 w-9 text-xs" : "h-16 w-16 text-xl",
                )}
              >
                {agentAvatarInitials(agent)}
              </span>
            </div>
          )}
          {badge && (
            <span
              className={cn(
                "absolute rounded-full font-semibold shadow",
                compact
                  ? "left-1.5 top-1.5 px-1.5 py-0.5 text-[9px]"
                  : "left-3 top-3 px-3 py-1 text-xs",
                BADGE_STYLES[badge],
              )}
            >
              {badge}
            </span>
          )}
          <button
            type="button"
            aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
            onClick={() => onToggleFavorite(agent)}
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-card/90 shadow transition hover:scale-110",
              compact ? "right-1.5 top-1.5 h-5 w-5" : "right-3 top-3 h-8 w-8",
            )}
          >
            <Heart
              className={cn(
                compact ? "h-3 w-3" : "h-4 w-4",
                isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground",
              )}
            />
          </button>
        </div>

        {/* Body */}
        <div className={compact ? "p-1.5" : "p-3"}>
          <div className="flex items-center gap-1.5">
            <h3 className={cn("truncate font-bold text-foreground", compact ? "text-xs" : "text-sm")}>{agentPublicLabel(agent)}</h3>
            {agent.verified && <BadgeCheck className={cn("shrink-0 text-primary", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />}
          </div>

          {ratings > 0 ? (
            <div className={cn("mt-1 flex items-center gap-1", compact ? "text-[11px]" : "text-xs")}>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({ratings} reviews)</span>
            </div>
          ) : (
            <p className={cn("mt-1 text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>No reviews yet</p>
          )}

          {agent.agency_name && !compact && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              {agent.agency_name}
            </p>
          )}

          {/* Stats — real agent data only */}
          <div className={cn("grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/40 text-center", compact ? "mt-2 py-1" : "mt-3 py-2")}>
            <div>
              <p className={cn("font-bold text-foreground", compact ? "text-[11px]" : "text-sm")}>{agent.experience_years ?? 0}+</p>
              <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>Years Exp.</p>
            </div>
            <div>
              <p className={cn("font-bold text-foreground", compact ? "text-[11px]" : "text-sm")}>{propertiesHandled(agent)}+</p>
              <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>Properties</p>
            </div>
            <div>
              <p className={cn("font-bold text-foreground", compact ? "text-[11px]" : "text-sm")}>{agent.trust_score ?? 0}%</p>
              <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>Trust Score</p>
            </div>
          </div>

          {specs.length > 0 && (
            <div className={cn("flex flex-wrap gap-1", compact ? "mt-2" : "mt-3")}>
              {specs.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          <p className={cn("flex items-center gap-1 text-muted-foreground", compact ? "mt-1.5 text-[11px]" : "mt-2 text-xs")}>
            <MapPin className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
            <span className="truncate">{location}</span>
          </p>

          <div className={cn("flex gap-2", compact ? "mt-2" : "mt-3")}>
            <Button
              variant="outline"
              size="sm"
              className={cn("flex-1 text-xs", compact ? "h-6 px-1 text-[10px]" : "h-8")}
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              View Profile
            </Button>
            <Button size="sm" className={cn("flex-1 gap-1 text-xs", compact ? "h-6 px-1 text-[10px]" : "h-8")} onClick={() => onContact(agent)}>
              <MessageCircle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              Contact
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AgentDiscoveryCard;
