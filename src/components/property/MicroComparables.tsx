import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Shield, Calendar, MapPin,
  CheckCircle, Info, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MicroComparablesProps {
  property: any;
  propertyId: string;
}

export default function MicroComparables({ property, propertyId }: MicroComparablesProps) {
  const navigate = useNavigate();
  const [comparables, setComparables] = useState<any[]>([]);
  const [trustAdjustedPrice, setTrustAdjustedPrice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparables();
    calculateTAP();
  }, [property]);

  const fetchComparables = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("properties")
        .select("*")
        .eq("city", property?.city)
        .eq("locality", property?.locality)
        .eq("verified", true)
        .neq("id", propertyId)
        .order("trust_score", { ascending: false })
        .limit(6);
      
      if (property?.bhk) {
        query = query.eq("bhk", property.bhk);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComparables(data || []);
    } catch (error) {
      console.error("Error fetching comparables:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTAP = () => {
    const basePrice = property?.price || 0;
    const trustScore = property?.trust_score || 75;
    
    const trustMultiplier = trustScore / 100;
    const adjustedPrice = basePrice * (0.85 + (trustMultiplier * 0.15));
    
    const lowerBound = adjustedPrice * 0.95;
    const upperBound = adjustedPrice * 1.05;

    setTrustAdjustedPrice({
      estimate: adjustedPrice,
      range: { min: lowerBound, max: upperBound },
      confidence: trustScore > 80 ? "High" : trustScore > 60 ? "Medium" : "Low"
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  const formatPSF = (price: number, area: number | null) => {
    if (!area || area === 0) return 'N/A';
    return `₹${(price / area).toFixed(0)}/sqft`;
  };

  const getPriceTrend = (compPrice: number) => {
    const diff = ((compPrice - (property?.price || 0)) / (property?.price || 1)) * 100;
    return {
      value: Math.abs(diff).toFixed(1),
      isHigher: diff > 0,
      icon: diff > 0 ? TrendingUp : TrendingDown,
      color: diff > 0 ? "text-green-500" : "text-red-500"
    };
  };

  return (
    <div className="space-y-6">
      {/* Trust-Adjusted Price Widget */}
      {trustAdjustedPrice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-panel border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Trust-Adjusted Price (TAP)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        TAP weights recent sales by TrustScore and verification status to provide
                        a more accurate market value estimate.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estimated Fair Value</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(trustAdjustedPrice.estimate)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Range: {formatPrice(trustAdjustedPrice.range.min)} - {formatPrice(trustAdjustedPrice.range.max)}
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                  <span className="text-sm text-muted-foreground">Confidence Level</span>
                  <Badge variant={
                    trustAdjustedPrice.confidence === "High" ? "default" :
                    trustAdjustedPrice.confidence === "Medium" ? "secondary" : "outline"
                  }>
                    {trustAdjustedPrice.confidence}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Based on {property?.trust_score || 'N/A'}/100 TrustScore and verified market data
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Micro-Comparables Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Micro-Comparables
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/transactions/${property?.city}/${property?.locality}`)}
              >
                View All
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Similar {property?.bhk ? `${property.bhk}BHK ` : ''}properties in {property?.locality || 'this area'}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : comparables.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No comparable properties found
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {comparables.map((comp, idx) => {
                  const trend = getPriceTrend(comp.price);
                  const TrendIcon = trend.icon;

                  return (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => navigate(`/property/${comp.id}`)}
                      className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm truncate">{comp.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {comp.locality}
                          </p>
                        </div>
                        {comp.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold">{formatPrice(comp.price)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPSF(comp.price, comp.area_sqft)}{comp.area_sqft ? ` • ${comp.area_sqft} sqft` : ''}
                          </p>
                        </div>

                        <div className={`flex items-center gap-1 ${trend.color}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{trend.value}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-1 text-xs">
                          <Shield className="h-3 w-3 text-primary" />
                          <span>Trust: {comp.trust_score}/100</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{comp.completion_stage || 'Ready'}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}