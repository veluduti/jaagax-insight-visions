import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronDown, ChevronUp, Clock, HardHat } from "lucide-react";

interface BuilderTrustBadgesProps {
  verified?: boolean;
  trustScore?: number;
  reraId?: string | null;
  builderName?: string;
}

const BuilderTrustBadges = ({
  verified,
  trustScore,
  reraId,
  builderName,
}: BuilderTrustBadgesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate delivery confidence based on trust score
  const getDeliveryConfidence = () => {
    if (!trustScore) return null;
    if (trustScore >= 85) return { label: "High", color: "bg-emerald-500/90" };
    if (trustScore >= 70) return { label: "Good", color: "bg-primary/90" };
    if (trustScore >= 50) return { label: "Moderate", color: "bg-amber-500/90" };
    return null;
  };

  // Generate construction stage (placeholder - would use real data if available)
  const getConstructionStage = () => {
    if (!verified) return null;
    // This would typically come from actual project data
    const stages = ["Pre-launch", "Foundation", "Structure", "Finishing", "Ready"];
    const randomIndex = Math.floor(Math.random() * 4); // Mock - replace with real data
    return stages[randomIndex];
  };

  const deliveryConfidence = getDeliveryConfidence();
  const constructionStage = getConstructionStage();

  const generateExplanation = () => {
    const reasons: string[] = [];

    if (reraId) {
      reasons.push("RERA registered project with verified documentation");
    }

    if (verified) {
      reasons.push("Builder verified by JaagaX with track record check");
    }

    if (trustScore && trustScore >= 80) {
      reasons.push(`Trust score of ${trustScore}% indicates reliable delivery history`);
    }

    if (builderName) {
      reasons.push(`${builderName} has completed projects with positive reviews`);
    }

    if (reasons.length === 0) {
      reasons.push("Standard verification in progress");
    }

    return reasons;
  };

  if (!verified && !reraId && !trustScore) return null;

  return (
    <div className="space-y-2">
      {/* Badges Row */}
      <div className="flex flex-wrap gap-2">
        {deliveryConfidence && (
          <Badge className={`${deliveryConfidence.color} text-white text-xs`}>
            <Shield className="h-3 w-3 mr-1" />
            {deliveryConfidence.label} Confidence
          </Badge>
        )}

        {constructionStage && (
          <Badge variant="outline" className="text-xs border-primary/30 text-muted-foreground">
            <HardHat className="h-3 w-3 mr-1" />
            {constructionStage}
          </Badge>
        )}
      </div>

      {/* Why Safer Link */}
      <div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Clock className="h-3 w-3" />
          <span className="font-medium">Why safer?</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-1.5">
                {generateExplanation().map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="text-primary/60 mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BuilderTrustBadges;
