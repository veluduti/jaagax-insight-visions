import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, TrendingUp, Home, MapPin, X } from "lucide-react";
import type mapboxgl from "mapbox-gl";

interface AIAreaLensProps {
  map: mapboxgl.Map | null;
  properties: any[];
}

const AIAreaLens = ({ map, properties }: AIAreaLensProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [areaStats, setAreaStats] = useState({
    avgPrice: 0,
    verifiedCount: 0,
    totalListings: 0,
    areaName: "Current Area",
  });
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  // Calculate area statistics
  useEffect(() => {
    if (!map || properties.length === 0) return;

    const bounds = map.getBounds();
    const visibleProperties = properties.filter((prop) => {
      return (
        prop.lng >= bounds.getWest() &&
        prop.lng <= bounds.getEast() &&
        prop.lat >= bounds.getSouth() &&
        prop.lat <= bounds.getNorth()
      );
    });

    const totalPrice = visibleProperties.reduce((sum, prop) => sum + prop.price, 0);
    const avgPrice = visibleProperties.length > 0 ? totalPrice / visibleProperties.length : 0;
    const verifiedCount = visibleProperties.filter((prop) => prop.verified).length;

    setAreaStats({
      avgPrice: avgPrice / 100000, // Convert to lakhs
      verifiedCount,
      totalListings: visibleProperties.length,
      areaName: visibleProperties[0]?.locality || "Current Area",
    });
  }, [map, properties]);

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;

    // Mock AI response - In production, this would call an AI API
    setAiResponse(
      `Based on your query "${aiQuery}", I found ${areaStats.totalListings} properties in ${areaStats.areaName}. ` +
      `The average price is ₹${areaStats.avgPrice.toFixed(1)}L, with ${areaStats.verifiedCount} verified listings. ` +
      `This area shows strong growth potential with good connectivity and amenities.`
    );
    setAiQuery("");
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
                  <p className="text-lg font-bold text-primary">₹{areaStats.avgPrice.toFixed(1)}L</p>
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{areaStats.verifiedCount}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{areaStats.totalListings}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
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
            <Card className="glass-panel p-6 space-y-4">
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
                  <p className="text-xl font-bold">₹{areaStats.avgPrice.toFixed(1)}L</p>
                  <p className="text-xs text-muted-foreground">Avg Price/sqft</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="h-4 w-4 p-0 bg-primary" />
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
                    onKeyPress={(e) => e.key === "Enter" && handleAIQuery()}
                    placeholder="e.g., Show luxury flats under ₹1Cr"
                    className="flex-1"
                  />
                  <Button onClick={handleAIQuery} size="icon" className="glow-effect">
                    <Send className="h-4 w-4" />
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiResponse}</p>
                </motion.div>
              )}

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setAiQuery("Show me verified properties only")}
                >
                  Verified Only
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setAiQuery("Best areas for investment")}
                >
                  Best Investment
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setAiQuery("Show me luxury properties")}
                >
                  Luxury Properties
                </Badge>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAreaLens;
