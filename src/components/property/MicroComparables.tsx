import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Shield, Calendar, MapPin,
  CheckCircle, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { useNavigate } from "react-router-dom";

interface MicroComparablesProps {
  property: any;
  propertyId: string;
}

export default function MicroComparables({ property, propertyId }: MicroComparablesProps) {
  const navigate = useNavigate();
  const [comparables, setComparables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparables();
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

      setComparables((data || []).map((row: any) => {
        const v = getPublicPropertyView(row);
        if (!v) return row;
        return {
          ...row,
          title: v.title,
          city: v.city ?? row.city,
          locality: v.locality ?? row.locality,
          price: v.price ?? row.price,
          area_sqft: v.area_sqft ?? row.area_sqft,
          bhk: v.bhk ?? row.bhk,
          images: v.images?.length ? v.images : row.images,
        };
      }));
    } catch (error) {
      console.error("Error fetching comparables:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  const formatPSF = (price: number, area: number | null) => {
    if (!area || area === 0) return null;
    return `₹${(price / area).toFixed(0)}/sqft`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Comparable Listings
            </span>
            {property?.city && property?.locality && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/transactions/${property.city}/${property.locality}`)}
              >
                View All
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verified {property?.bhk ? `${property.bhk} BHK ` : ''}listings in {property?.locality || 'this area'}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : comparables.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No verified comparable listings yet in this locality.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comparables.map((comp, idx) => {
                const psf = formatPSF(comp.price, comp.area_sqft);
                return (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => navigate(`/property/${comp.slug || comp.id}`)}
                    className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
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

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold">{formatPrice(comp.price)}</p>
                        {(psf || comp.area_sqft) && (
                          <p className="text-xs text-muted-foreground">
                            {psf}{psf && comp.area_sqft ? ' • ' : ''}{comp.area_sqft ? `${comp.area_sqft} sqft` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {(comp.trust_score || comp.completion_stage) && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        {comp.trust_score != null && (
                          <div className="flex items-center gap-1 text-xs">
                            <Shield className="h-3 w-3 text-primary" />
                            <span>Trust: {comp.trust_score}/100</span>
                          </div>
                        )}
                        {comp.completion_stage && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{comp.completion_stage}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
