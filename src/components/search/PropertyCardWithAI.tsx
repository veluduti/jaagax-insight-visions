import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openInNewTab, propertyPath } from "@/lib/openInNewTab";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface PropertyDecision {
  property_id: string;
  match_score: number;
  ai_verdict: "best_for_you" | "alternative" | "risky";
  risk_flags: string[];
  positive_flags: string[];
  reasoning: {
    life_stage_fit: boolean;
    budget_comfort: "good" | "tight" | "stretch";
    delay_risk: "low" | "medium" | "high";
    trust_level: "high" | "medium" | "low";
  };
}

interface Property {
  id: string;
  slug?: string | null;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  trust_score: number | null;
  is_featured?: boolean | null;
}

interface PropertyCardWithAIProps {
  property: Property;
  decision?: PropertyDecision;
  index: number;
}

const PropertyCardWithAI = ({ property, decision, index }: PropertyCardWithAIProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const imageUrls: string[] = Array.isArray(property.images)
    ? property.images
    : typeof property.images === "string"
      ? property.images
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

  const beds = property.bedrooms ?? property.bhk;
  const baths = property.bathrooms;
  const area = property.area_sqft;

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case "best_for_you":
        return {
          label: "Best for you",
          icon: ThumbsUp,
          bgColor: "bg-green-500",
          textColor: "text-green-600",
          borderColor: "border-green-500/30",
        };
      case "alternative":
        return {
          label: "Alternative",
          icon: AlertCircle,
          textColor: "text-amber-600",
          bgColor: "bg-amber-500",
          borderColor: "border-amber-500/30",
        };
      case "risky":
        return {
          label: "Risky",
          icon: XCircle,
          textColor: "text-red-600",
          bgColor: "bg-red-500",
          borderColor: "border-red-500/30",
        };
      default:
        return {
          label: "Unknown",
          icon: AlertCircle,
          textColor: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
        };
    }
  };

  const verdictConfig = decision ? getVerdictConfig(decision.ai_verdict) : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the expand button
    if ((e.target as HTMLElement).closest(".ai-expand-btn")) {
      return;
    }
    openInNewTab(propertyPath(property));
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`glass-card hover:scale-[1.02] transition-all cursor-pointer group overflow-hidden ${
          decision ? verdictConfig?.borderColor : ""
        } ${decision ? "border-2" : ""}`}
        onClick={handleCardClick}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrls[0] || ""}
            alt={property.title}
            onError={(e) => {
              e.currentTarget.src = "";
            }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            {property.is_featured && (
              <Badge className="bg-amber-500 text-white backdrop-blur gap-1">
                <Sparkles className="w-3 h-3" /> Featured
              </Badge>
            )}
            {property.verified && (
              <Badge className="bg-primary/90 backdrop-blur">Verified</Badge>
            )}
          </div>

          {/* AI Match Badge */}
          {decision && (
            <div className="absolute top-3 left-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={`${verdictConfig?.bgColor} text-white backdrop-blur cursor-help flex items-center gap-1`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {decision.match_score}% Match
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold mb-1">Why this property?</p>
                  <p className="text-xs text-muted-foreground">
                    Click the AI button below to see detailed analysis
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            {decision && verdictConfig && (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 shrink-0 ${verdictConfig.textColor}`}
              >
                <verdictConfig.icon className="w-3 h-3" />
                {verdictConfig.label}
              </Badge>
            )}
          </div>

          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">
              {property.locality || "—"}, {property.city || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xl font-bold text-primary">
              {formatPrice(property.price)}
            </span>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {beds != null && beds > 0 && (
                <span className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  {beds}
                </span>
              )}
              {baths != null && baths > 0 && (
                <span className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  {baths}
                </span>
              )}
              {area != null && (
                <span className="flex items-center gap-1">
                  <Square className="w-4 h-4" />
                  {area} sq.ft
                </span>
              )}
            </div>
          </div>

          {/* AI Expand Button */}
          {decision && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full ai-expand-btn flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary"
              onClick={toggleExpand}
            >
              <Sparkles className="w-3 h-3" />
              Why this property?
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}

          {/* Expanded AI Panel */}
          <AnimatePresence>
            {expanded && decision && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t space-y-2">
                  {/* Positive flags */}
                  {decision.positive_flags.map((flag, i) => (
                    <div
                      key={`pos-${i}`}
                      className="flex items-center gap-2 text-sm text-green-600"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}

                  {/* Risk flags */}
                  {decision.risk_flags.map((flag, i) => (
                    <div
                      key={`risk-${i}`}
                      className="flex items-center gap-2 text-sm text-amber-600"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}

                  {/* Summary row */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        decision.reasoning.life_stage_fit
                          ? "text-green-600 border-green-500/30"
                          : "text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {decision.reasoning.life_stage_fit
                        ? "✓ Life stage fit"
                        : "⚠ Life stage mismatch"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        decision.reasoning.budget_comfort === "good"
                          ? "text-green-600 border-green-500/30"
                          : decision.reasoning.budget_comfort === "tight"
                          ? "text-amber-600 border-amber-500/30"
                          : "text-red-600 border-red-500/30"
                      }`}
                    >
                      {decision.reasoning.budget_comfort === "good"
                        ? "✓ Budget OK"
                        : decision.reasoning.budget_comfort === "tight"
                        ? "⚠ EMI tight"
                        : "⚠ Budget stretch"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        decision.reasoning.delay_risk === "low"
                          ? "text-green-600 border-green-500/30"
                          : decision.reasoning.delay_risk === "medium"
                          ? "text-amber-600 border-amber-500/30"
                          : "text-red-600 border-red-500/30"
                      }`}
                    >
                      {decision.reasoning.delay_risk === "low"
                        ? "✓ Low delay risk"
                        : decision.reasoning.delay_risk === "medium"
                        ? "⚠ Some delay risk"
                        : "⚠ High delay risk"}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

export default PropertyCardWithAI;
