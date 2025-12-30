import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertySearchBar from "@/components/PropertySearchBar";
import PropertyCardWithAI from "@/components/search/PropertyCardWithAI";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  bhk: number;
  type: string;
  images: string[];
  verified: boolean;
  trust_score: number;
  status?: string;
}

interface PropertyDecision {
  property_id: number;
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

// Session cache for AI decisions
const decisionCache = new Map<string, PropertyDecision[]>();

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { buyerContext, hasBuyerContext } = useBuyerContext();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [decisions, setDecisions] = useState<Map<number, PropertyDecision>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("properties");
  
  const lastSearchKey = useRef<string>("");

  useEffect(() => {
    const query = searchParams.get("q");
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    
    if (query || city || type) {
      searchProperties(query, city, type);
    } else {
      fetchAllProperties();
    }
  }, [searchParams]);

  // Fetch AI decisions when properties and buyer context are available
  useEffect(() => {
    if (properties.length > 0 && user && role === "buyer" && hasBuyerContext) {
      fetchAIDecisions();
    }
  }, [properties, user, role, hasBuyerContext, buyerContext]);

  const searchProperties = async (query: string | null, city: string | null, type: string | null) => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("verified", true);

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,locality.ilike.%${query}%,city.ilike.%${query}%`);
      }
      if (city) {
        queryBuilder = queryBuilder.eq("city", city);
      }
      if (type) {
        queryBuilder = queryBuilder.eq("type", type);
      }

      const { data, error, count } = await queryBuilder
        .order("trust_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      setProperties(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProperties = async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("verified", true)
      .order("trust_score", { ascending: false })
      .limit(50);

    if (!error) {
      setProperties(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const fetchAIDecisions = async () => {
    if (!buyerContext) return;

    // Create cache key based on user + properties
    const propertyIds = properties.map((p) => p.id).sort().join(",");
    const cacheKey = `${user?.id}-${propertyIds}`;

    // Check session cache
    if (decisionCache.has(cacheKey)) {
      const cached = decisionCache.get(cacheKey)!;
      const decisionMap = new Map<number, PropertyDecision>();
      cached.forEach((d) => decisionMap.set(d.property_id, d));
      setDecisions(decisionMap);
      return;
    }

    // Avoid duplicate requests
    if (lastSearchKey.current === cacheKey) return;
    lastSearchKey.current = cacheKey;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-property-decision", {
        body: {
          properties: properties.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            verified: p.verified,
            trust_score: p.trust_score,
            status: p.status,
            bhk: p.bhk,
            type: p.type,
            locality: p.locality,
          })),
          buyerContext: {
            life_stage: buyerContext.life_stage,
            budget_comfort: buyerContext.budget_comfort,
            primary_fear: buyerContext.primary_fear,
            decision_mode: buyerContext.decision_mode,
            confidence_score: buyerContext.confidence_score,
          },
        },
      });

      if (error) {
        console.error("AI Decision error:", error);
        return;
      }

      if (data?.decisions) {
        // Cache the results
        decisionCache.set(cacheKey, data.decisions);

        // Create decision map
        const decisionMap = new Map<number, PropertyDecision>();
        data.decisions.forEach((d: PropertyDecision) => {
          decisionMap.set(d.property_id, d);
        });
        setDecisions(decisionMap);
      }
    } catch (error) {
      console.error("AI Decision fetch error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  const showAIFeatures = user && role === "buyer" && hasBuyerContext;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16">
        <div className="container-padding max-w-7xl mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Search Properties
            </h1>
            <div className="flex items-center gap-4 mb-6">
              <p className="text-muted-foreground">
                {total > 0 ? `Found ${total} properties` : "Search for your dream property"}
              </p>
              {showAIFeatures && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-powered insights enabled
                </Badge>
              )}
              {loadingAI && (
                <Badge variant="outline" className="animate-pulse">
                  Analyzing...
                </Badge>
              )}
            </div>
            
            <PropertySearchBar activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="glass-card p-12 max-w-md mx-auto">
                <p className="text-xl text-muted-foreground mb-4">
                  No properties found
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Try adjusting your search criteria
                </p>
                <Button onClick={() => navigate("/")}>
                  Back to Home
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {properties.map((property, index) => (
                <PropertyCardWithAI
                  key={property.id}
                  property={property}
                  decision={showAIFeatures ? decisions.get(property.id) : undefined}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Search;
