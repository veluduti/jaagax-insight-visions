import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { aiService } from "@/services/aiService";
import { runWhenIdle } from "@/lib/aiCache";
import { Sparkles, ThumbsUp, AlertCircle, XCircle, ChevronRight, MapPin } from "lucide-react";

interface PropertyInsight {
  id: string;
  slug?: string | null;
  title: string;
  locality: string | null;
  city: string | null;
  price: number;
  matchScore: number;
  reasoning: string;
  category: "best" | "alternative" | "not_right";
  images: string[] | null;
}

const AIInsightStrip = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { buyerContext, hasBuyerContext } = useBuyerContext();
  const [insights, setInsights] = useState<PropertyInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user || role !== "buyer" || !hasBuyerContext) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Defer AI work to idle so it never blocks initial paint.
    const handle = runWhenIdle(async () => {
      try {
        const { data: properties } = await (supabase
          .from("properties" as any)
          .select("id,slug,title,price,locality,city,bhk,bedrooms,type,verified,trust_score,status,images")
          .limit(20) as any);

        if (!properties || properties.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        const aiResult = await aiService.suggestProperties({
          userId: user?.id,
          buyerContext,
          properties: properties.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            locality: p.locality || "",
            city: p.city || "",
            bhk: p.bhk || p.bedrooms || 0,
            type: p.type || "",
          })),
        }).catch(() => ({ suggestions: [] as number[] }));

        if (cancelled) return;
        const categorized = categorizeProperties(properties, aiResult?.suggestions || []);
        setInsights(categorized);
      } catch (error) {
        console.error("Error fetching AI insights:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      try {
        const cic = (globalThis as any).cancelIdleCallback;
        if (typeof cic === "function") cic(handle);
        else clearTimeout(handle as any);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, hasBuyerContext, buyerContext]);


  const categorizeProperties = (
    properties: any[],
    suggestions: number[]
  ): PropertyInsight[] => {
    const result: PropertyInsight[] = [];
    const fears = buyerContext?.primary_fear || [];
    const budgetComfort = buyerContext?.budget_comfort || "flexible";
    const decisionMode = buyerContext?.decision_mode || "buy_now";

    // Find best match
    const bestProperty = properties.find((p) => suggestions.includes(p.id)) || properties[0];
    if (bestProperty) {
      result.push({
        ...bestProperty,
        matchScore: calculateMatchScore(bestProperty, fears, budgetComfort, decisionMode, true),
        reasoning: generateReasoning(bestProperty, fears, budgetComfort, "best"),
        category: "best",
      });
    }

    // Find alternative
    const altProperty = properties.find(
      (p) => p.id !== bestProperty?.id && p.verified
    ) || properties[1];
    if (altProperty) {
      result.push({
        ...altProperty,
        matchScore: calculateMatchScore(altProperty, fears, budgetComfort, decisionMode, false),
        reasoning: generateReasoning(altProperty, fears, budgetComfort, "alternative"),
        category: "alternative",
      });
    }

    // Find not right for now
    const notRightProperty = properties.find(
      (p) => p.id !== bestProperty?.id && p.id !== altProperty?.id && !p.verified
    ) || properties[2];
    if (notRightProperty) {
      result.push({
        ...notRightProperty,
        matchScore: calculateMatchScore(notRightProperty, fears, budgetComfort, decisionMode, false) - 20,
        reasoning: generateReasoning(notRightProperty, fears, budgetComfort, "not_right"),
        category: "not_right",
      });
    }

    return result;
  };

  const calculateMatchScore = (
    property: any,
    fears: string[],
    budgetComfort: string,
    decisionMode: string,
    isSuggested: boolean
  ): number => {
    let score = isSuggested ? 85 : 60;

    // Adjust based on verification
    if (property.verified) score += 10;

    // Adjust based on trust score
    if (property.trust_score >= 80) score += 5;
    else if (property.trust_score < 60) score -= 10;

    // Adjust based on fears
    if (fears.includes("legal_trust") && property.verified) score += 5;
    if (fears.includes("builder_delay") && property.status === "Ready") score += 5;

    // Adjust based on budget comfort
    if (budgetComfort === "strict" && property.price < 5000000) score += 5;
    if (budgetComfort === "premium" && property.price > 10000000) score += 5;

    return Math.min(98, Math.max(30, score));
  };

  const generateReasoning = (
    property: any,
    fears: string[],
    budgetComfort: string,
    category: "best" | "alternative" | "not_right"
  ): string => {
    if (category === "best") {
      if (property.verified && fears.includes("legal_trust")) {
        return "Verified property addresses your trust concerns";
      }
      if (fears.includes("builder_delay") && property.status === "Ready") {
        return "Ready-to-move property, no construction delays";
      }
      if (budgetComfort === "strict") {
        return "Great value within your strict budget range";
      }
      return "High match score based on your preferences";
    }

    if (category === "alternative") {
      if (property.verified) {
        return "Verified option worth considering";
      }
      return "Different locality with similar features";
    }

    // not_right
    if (!property.verified) {
      return "Unverified listing - proceed with caution";
    }
    if (fears.includes("builder_delay") && property.status !== "Ready") {
      return "Under construction - may cause delays";
    }
    return "Doesn't align with your current priorities";
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    }
    return `₹${(price / 100000).toFixed(0)} L`;
  };

  const getCategoryConfig = (category: "best" | "alternative" | "not_right") => {
    switch (category) {
      case "best":
        return {
          label: "Best for you",
          icon: ThumbsUp,
          color: "bg-green-500/10 text-green-600 border-green-500/20",
          badgeColor: "bg-green-500",
        };
      case "alternative":
        return {
          label: "Consider this",
          icon: AlertCircle,
          color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          badgeColor: "bg-amber-500",
        };
      case "not_right":
        return {
          label: "Not right now",
          icon: XCircle,
          color: "bg-red-500/10 text-red-600 border-red-500/20",
          badgeColor: "bg-red-500",
        };
    }
  };

  // Hide for guests or non-buyers or those without buyer context
  if (!user || role !== "buyer" || !hasBuyerContext) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-8 px-4 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">AI Insights for You</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="py-8 px-4 bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="container mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">AI Insights for You</h2>
          <Badge variant="secondary" className="ml-2">
            Based on your profile
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {insights.map((insight, index) => {
            const config = getCategoryConfig(insight.category);
            const Icon = config.icon;

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer hover:shadow-lg transition-all border-2 ${config.color}`}
                  onClick={() => window.open(`/property/${insight.slug || insight.id}`, "_blank", "noopener,noreferrer")}
                >
                  <CardContent className="p-4">
                    {/* Category badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{config.label}</span>
                      </div>
                      <Badge className={`${config.badgeColor} text-white`}>
                        {insight.matchScore}% Match
                      </Badge>
                    </div>

                    {/* Property info */}
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={insight.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"}
                          alt={insight.title}
                          className="w-full h-full object-cover"
                         loading="lazy" decoding="async" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-1 text-foreground">
                          {insight.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {insight.locality}
                        </p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatPrice(insight.price)}
                        </p>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {insight.reasoning}
                      </p>
                    </div>

                    {/* View link */}
                    <div className="flex items-center justify-end mt-2 text-xs text-primary font-medium">
                      View Details
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AIInsightStrip;
