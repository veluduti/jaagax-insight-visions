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
}

const AgentDiscoveryCard = ({ agent, index, isFavorite, onToggleFavorite, onContact }: Props) => {
  const navigate = useNavigate();
  const badge = deriveBadge(agent);
  const rating = Number(agent.avg_rating || 0);
  const ratings = agent.total_ratings || 0;
  const specs = (agent.specializations || []).filter(Boolean).slice(0, 4);
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
        <div className="relative h-32 bg-muted">
          {agent.photo_url ? (
            <img
              src={agent.photo_url}
              alt={agentPublicLabel(agent)}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {agentAvatarInitials(agent)}
              </span>
            </div>
          )}
          {badge && (
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow",
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
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow transition hover:scale-110"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground",
              )}
            />
          </button>
        </div>

        {/* Body */}
        <div className="p-3">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-foreground">{agentPublicLabel(agent)}</h3>
            {agent.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>

          {ratings > 0 ? (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({ratings} reviews)</span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No reviews yet</p>
          )}

          {agent.agency_name && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              {agent.agency_name}
            </p>
          )}

          {/* Stats — real agent data only */}
          <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/40 py-2 text-center">
            <div>
              <p className="text-sm font-bold text-foreground">{agent.experience_years ?? 0}+</p>
              <p className="text-[10px] text-muted-foreground">Years Exp.</p>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{propertiesHandled(agent)}+</p>
              <p className="text-[10px] text-muted-foreground">Properties</p>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{agent.trust_score ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground">Trust Score</p>
            </div>
          </div>

          {specs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {specs.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              View Profile
            </Button>
            <Button size="sm" className="h-8 flex-1 gap-1 text-xs" onClick={() => onContact(agent)}>
              <MessageCircle className="h-3.5 w-3.5" />
              Contact
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AgentDiscoveryCard;
