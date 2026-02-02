import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Languages,
  MapPin,
  MessageCircle,
  Eye,
} from "lucide-react";

interface AgentCardProps {
  agent: {
    id: string;
    name: string | null;
    agency_name: string | null;
    languages: string[] | null;
    cities_served: string[] | null;
    sales_count: number | null;
    rent_count: number | null;
    photo_url: string | null;
    trust_score: number | null;
    verified: boolean | null;
  };
  index: number;
}

const AgentCard = ({ agent, index }: AgentCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-panel border-0 p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
        {/* Verified Ribbon */}
        {agent.verified && (
          <div className="absolute top-0 right-0">
            <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rotate-45 translate-x-8 translate-y-2">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              Verified
            </div>
          </div>
        )}

        {/* Agent Info */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/50">
            <AvatarImage src={agent.photo_url || ""} alt={agent.name || ""} />
            <AvatarFallback>{(agent.name || "A").charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{agent.name}</h3>
            <p className="text-sm text-muted-foreground">{agent.agency_name}</p>
          </div>
        </div>

        {/* Trust Score */}
        <Badge variant="secondary" className="mb-3">
          Trust Score: {agent.trust_score || 0}%
        </Badge>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2 rounded-lg bg-background/50">
            <div className="text-2xl font-bold text-primary">{agent.sales_count || 0}</div>
            <div className="text-xs text-muted-foreground">Sales</div>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <div className="text-2xl font-bold text-primary">{agent.rent_count || 0}</div>
            <div className="text-xs text-muted-foreground">Rentals</div>
          </div>
        </div>

        {/* Languages */}
        <div className="flex items-center gap-2 mb-2 text-sm">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{(agent.languages || []).join(", ")}</span>
        </div>

        {/* Cities */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground line-clamp-1">
            {(agent.cities_served || []).join(", ")}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => navigate(`/agent/${agent.id}`)}
          >
            <Eye className="h-4 w-4" />
            View Profile
          </Button>
          <Button className="flex-1 gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat Now
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default AgentCard;
