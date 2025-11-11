import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, Zap, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface AgentBadgesProps {
  verified: boolean;
  trustScore: number;
  salesCount: number;
  rentCount: number;
}

const AgentBadges = ({ verified, trustScore, salesCount, rentCount }: AgentBadgesProps) => {
  const badges = [];

  // JaagaX Verified
  if (verified) {
    badges.push({
      icon: CheckCircle2,
      label: "JaagaX Verified™",
      color: "bg-green-600 text-white border-green-600",
      description: "Identity and credentials verified"
    });
  }

  // Top Performer (based on sales)
  if (salesCount >= 20) {
    badges.push({
      icon: Award,
      label: "Top Performer",
      color: "bg-blue-600 text-white border-blue-600",
      description: "High sales volume"
    });
  }

  // Quality Lister (based on trust score)
  if (trustScore >= 85) {
    badges.push({
      icon: Star,
      label: "Quality Lister",
      color: "bg-purple-600 text-white border-purple-600",
      description: "High-quality property listings"
    });
  }

  // Responsive Agent
  if (trustScore >= 80) {
    badges.push({
      icon: Zap,
      label: "Responsive Agent",
      color: "bg-orange-600 text-white border-orange-600",
      description: "Quick response time"
    });
  }

  // Market Expert
  if (salesCount + rentCount >= 30) {
    badges.push({
      icon: TrendingUp,
      label: "Market Expert",
      color: "bg-emerald-600 text-white border-emerald-600",
      description: "Extensive market experience"
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Professional Badges
      </h3>
      <div className="flex flex-wrap gap-3">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Badge 
                className={`${badge.color} py-2 px-4 text-sm font-medium gap-2 cursor-default`}
                title={badge.description}
              >
                <Icon className="h-4 w-4" />
                {badge.label}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentBadges;
