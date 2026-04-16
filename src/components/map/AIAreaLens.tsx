import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, TrendingUp, Home, MapPin, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type mapboxgl from "mapbox-gl";

interface AIAreaLensProps {
  map: mapboxgl.Map | null;
  properties: any[];
}

const AIAreaLens = ({ map, properties }: AIAreaLensProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [areaStats, setAreaStats] = useState({
    avgPricePerSqft: 0,
    avgPrice: 0,
    verifiedCount: 0,
    totalListings: 0,
    areaName: "Current Area",
    typeBreakdown: {} as Record<string, number>,
    bhkBreakdown: {} as Record<string, number>,
  });
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Calculate area statistics from visible properties
  const recalcStats = useCallback(() => {
    if (!map || properties.length === 0) return;

    const bounds = map.getBounds();
    const visible = properties.filter((prop) => {
      const lat = prop.latitude ?? prop.lat;
      const lng = prop.longitude ?? prop.lng;
      if (!lat || !lng) return false;
      return (
        lng >= bounds.getWest() &&
        lng <= bounds.getEast() &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth()
      );
    });

    const totalPrice = visible.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
    const totalArea = visible.reduce((sum: number, p: any) => sum + (p.area_sqft || 0), 0);
    const verifiedCount = visible.filter((p: any) => p.verified).length;

    const typeBreakdown: Record<string, number> = {};
    const bhkBreakdown: Record<string, number> = {};
    visible.forEach((p: any) => {
      const t = p.type || "Other";
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
      if (p.bhk) {
        const b = `${p.bhk}BHK`;
        bhkBreakdown[b] = (bhkBreakdown[b] || 0) + 1;
      }
    });

    // Find most common locality
    const localityCounts: Record<string, number> = {};
    visible.forEach((p: any) => {
      if (p.locality) localityCounts[p.locality] = (localityCounts[p.locality] || 0) + 1;
    });
    const topLocality = Object.entries(localityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Current Area";

    setAreaStats({
      avgPricePerSqft: totalArea > 0 ? Math.round(totalPrice / totalArea) : 0,
      avgPrice: visible.length > 0 ? totalPrice / visible.length / 100000 : 0,
      verifiedCount,
      totalListings: visible.length,
      areaName: topLocality,
      typeBreakdown,
      bhkBreakdown,
    });
  }, [map, properties]);

  useEffect(() => {
    recalcStats();
    if (map) {
      map.on("moveend", recalcStats);
      return () => { map.off("moveend", recalcStats); };
    }
  }, [map, properties, recalcStats]);

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");

    try {
      // Build context from properties
      const context = {
        totalProperties: properties.length,
        areaName: areaStats.areaName,
        avgPricePerSqft: areaStats.avgPricePerSqft,
        avgPriceLakhs: areaStats.avgPrice.toFixed(1),
        verifiedCount: areaStats.verifiedCount,
        totalListings: areaStats.totalListings,
        typeBreakdown: areaStats.typeBreakdown,
        bhkBreakdown: areaStats.bhkBreakdown,
        properties: properties.slice(0, 20).map(p => ({
          title: p.title,
          locality: p.locality,
          city: p.city,
          price: p.price,
          area_sqft: p.area_sqft,
          bhk: p.bhk,
          type: p.type,
          verified: p.verified,
          trust_score: p.trust_score,
        })),
      };

      const { data, error } = await supabase.functions.invoke("ai-property-expert", {
        body: {
          query: aiQuery,
          context: JSON.stringify(context),
          mode: "area_lens",
        },
      });

      if (error) throw error;
      setAiResponse(data?.response || data?.answer || "I couldn't find specific information for that query. Try asking about prices, property types, or verified listings in this area.");
    } catch (err: any) {
      console.error("AI query error:", err);
      // Fallback: generate response from local data
      const query = aiQuery.toLowerCase();
      let response = "";

      if (query.includes("verified")) {
        response = `There are ${areaStats.verifiedCount} JaagaX Verified™ properties out of ${areaStats.totalListings} total listings in ${areaStats.areaName}. Verified properties have undergone thorough documentation checks.`;
      } else if (query.includes("luxury") || query.includes("premium")) {
        const luxuryProps = properties.filter(p => p.price > 20000000);
        response = `Found ${luxuryProps.length} luxury properties (above ₹2Cr) in the visible area. ${luxuryProps.slice(0, 3).map(p => `${p.title} at ₹${(p.price / 10000000).toFixed(1)}Cr`).join(", ")}.`;
      } else if (query.includes("invest")) {
        response = `${areaStats.areaName} shows an average price of ₹${areaStats.avgPricePerSqft}/sqft. With ${areaStats.verifiedCount} verified listings out of ${areaStats.totalListings}, this area has good transparency. Properties here range across ${Object.keys(areaStats.typeBreakdown).join(", ")}.`;
      } else if (query.includes("cheap") || query.includes("affordable") || query.includes("budget")) {
        const affordable = properties.filter(p => p.price < 5000000).sort((a, b) => a.price - b.price);
        response = affordable.length > 0
          ? `Found ${affordable.length} affordable properties (under ₹50L). Most affordable: ${affordable.slice(0, 3).map(p => `${p.title} at ₹${(p.price / 100000).toFixed(0)}L`).join(", ")}.`
          : `No properties under ₹50L in the current view. Try expanding the map or adjusting filters.`;
      } else if (query.includes("villa")) {
        const villas = properties.filter(p => p.type?.toLowerCase().includes("villa"));
        response = villas.length > 0
          ? `Found ${villas.length} villas: ${villas.slice(0, 3).map(p => `${p.title} (${p.bhk}BHK, ₹${(p.price / 100000).toFixed(0)}L)`).join(", ")}.`
          : "No villas found in the current area. Try searching in Jubilee Hills or Narsingi.";
      } else {
        response = `In ${areaStats.areaName}: ${areaStats.totalListings} properties, avg ₹${areaStats.avgPricePerSqft}/sqft, ${areaStats.verifiedCount} verified. Types: ${Object.entries(areaStats.typeBreakdown).map(([k, v]) => `${k}(${v})`).join(", ")}. BHK: ${Object.entries(areaStats.bhkBreakdown).map(([k, v]) => `${k}(${v})`).join(", ")}.`;
      }
      setAiResponse(response);
    } finally {
      setIsAiLoading(false);
      setAiQuery("");
    }
  };

  return (
    <>
      {/* Compact Widget */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-6 z-10"
          >
            <Card className="glass-panel p-4 max-w-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsExpanded(true)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Area Lens</h3>
                  <p className="text-xs text-muted-foreground">{areaStats.areaName}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">₹{areaStats.avgPricePerSqft}</p>
                  <p className="text-xs text-muted-foreground">Avg/sqft</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{areaStats.verifiedCount}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{areaStats.totalListings}</p>
                  <p className="text-xs text-muted-foreground">Listings</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-6 z-10 w-full max-w-md"
          >
            <Card className="glass-panel p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold">AI Area Lens</h3>
                    <p className="text-sm text-muted-foreground">{areaStats.areaName}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xl font-bold">₹{areaStats.avgPricePerSqft}</p>
                  <p className="text-xs text-muted-foreground">Avg/sqft</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xl font-bold">{areaStats.verifiedCount}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xl font-bold">{areaStats.totalListings}</p>
                  <p className="text-xs text-muted-foreground">Listings</p>
                </div>
              </div>

              {/* Type & BHK Breakdown */}
              {Object.keys(areaStats.typeBreakdown).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Property Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(areaStats.typeBreakdown).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(areaStats.bhkBreakdown).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">BHK Distribution</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(areaStats.bhkBreakdown).sort().map(([bhk, count]) => (
                      <Badge key={bhk} variant="secondary" className="text-xs">
                        {bhk} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Query Input */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ask JaagaXGPT about this area
                </div>
                <div className="flex gap-2">
                  <Input
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAIQuery()}
                    placeholder="e.g., Show luxury flats under ₹1Cr"
                    className="flex-1"
                    disabled={isAiLoading}
                  />
                  <Button onClick={handleAIQuery} size="icon" className="glow-effect" disabled={isAiLoading}>
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* AI Response */}
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <p className="text-sm text-foreground/90 leading-relaxed">{aiResponse}</p>
                </motion.div>
              )}

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-2">
                {["Verified properties", "Best for investment", "Luxury villas", "Affordable under ₹50L", "3BHK apartments"].map(q => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => { setAiQuery(q); }}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAreaLens;
