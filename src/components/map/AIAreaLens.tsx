import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  currentCity?: string;
  onClose?: () => void;
}

const AIAreaLens = ({ map, properties, currentCity, onClose }: AIAreaLensProps) => {
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

  const recalcStats = useCallback(() => {
    if (!map || properties.length === 0) {
      setAreaStats(s => ({ ...s, totalListings: 0 }));
      return;
    }
    const bounds = map.getBounds();
    const visible = properties.filter((prop) => {
      const lat = prop.latitude ?? prop.lat;
      const lng = prop.longitude ?? prop.lng;
      if (!lat || !lng) return false;
      return lng >= bounds.getWest() && lng <= bounds.getEast() && lat >= bounds.getSouth() && lat <= bounds.getNorth();
    });

    const totalPrice = visible.reduce((s: number, p: any) => s + (p.price || 0), 0);
    const totalArea = visible.reduce((s: number, p: any) => s + (p.area_sqft || 0), 0);
    const verifiedCount = visible.filter((p: any) => p.verified).length;
    const typeBreakdown: Record<string, number> = {};
    const bhkBreakdown: Record<string, number> = {};
    const localityCounts: Record<string, number> = {};
    visible.forEach((p: any) => {
      const t = p.type || "Other";
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
      if (p.bhk) bhkBreakdown[`${p.bhk}BHK`] = (bhkBreakdown[`${p.bhk}BHK`] || 0) + 1;
      if (p.locality) localityCounts[p.locality] = (localityCounts[p.locality] || 0) + 1;
    });
    const topLocality = Object.entries(localityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || (currentCity ?? "Current Area");

    setAreaStats({
      avgPricePerSqft: totalArea > 0 ? Math.round(totalPrice / totalArea) : 0,
      avgPrice: visible.length > 0 ? totalPrice / visible.length / 100000 : 0,
      verifiedCount,
      totalListings: visible.length,
      areaName: topLocality,
      typeBreakdown,
      bhkBreakdown,
    });
  }, [map, properties, currentCity]);

  useEffect(() => {
    recalcStats();
    if (map) {
      map.on("moveend", recalcStats);
      return () => { map.off("moveend", recalcStats); };
    }
  }, [map, properties, recalcStats]);

  // Smart local responder — Google-like deterministic answers using full property dataset
  const localResponder = (query: string): string => {
    const q = query.toLowerCase();
    const fmtP = (p: number) => p >= 10000000 ? `₹${(p/10000000).toFixed(2)}Cr` : `₹${(p/100000).toFixed(1)}L`;

    // City scope detection
    const cityFilter = (props: any[]) => {
      if (q.includes("hyderabad")) return props.filter(p => (p.city || "").toLowerCase().includes("hyderabad"));
      if (q.includes("vijayawada")) return props.filter(p => (p.city || "").toLowerCase().includes("vijayawada"));
      return props;
    };
    let scope = cityFilter(properties);

    // Locality detection
    const localityMatch = scope.find(p => p.locality && q.includes((p.locality as string).toLowerCase()));
    if (localityMatch) scope = scope.filter(p => (p.locality || "").toLowerCase() === (localityMatch.locality as string).toLowerCase());

    // BHK detection
    const bhkMatch = q.match(/(\d)\s*bhk/);
    if (bhkMatch) scope = scope.filter(p => p.bhk === parseInt(bhkMatch[1]));

    // Type detection
    const types = ["villa", "apartment", "plot", "penthouse", "office", "commercial"];
    const typeWord = types.find(t => q.includes(t));
    if (typeWord) scope = scope.filter(p => (p.type || "").toLowerCase().includes(typeWord));

    // Price ceiling
    const underMatch = q.match(/under\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(cr|l|crore|lakh)?/i);
    if (underMatch) {
      const num = parseFloat(underMatch[1]);
      const unit = (underMatch[2] || "l").toLowerCase();
      const ceiling = unit.startsWith("c") ? num * 10000000 : num * 100000;
      scope = scope.filter(p => p.price <= ceiling);
    }

    // Verified filter
    if (q.includes("verified")) scope = scope.filter(p => p.verified);

    // Cheapest / luxury keywords
    if (q.includes("cheap") || q.includes("affordable") || q.includes("budget")) {
      scope = [...scope].sort((a, b) => a.price - b.price);
    } else if (q.includes("luxury") || q.includes("premium") || q.includes("expensive")) {
      scope = [...scope].sort((a, b) => b.price - a.price);
    }

    if (scope.length === 0) {
      return `I couldn't find matching properties. Try broader filters or check the other city.`;
    }

    // "show all" / "list" intent
    if (q.includes("show all") || q.includes("list") || q.includes("all properties") || q.includes("how many")) {
      const top = scope.slice(0, 5).map(p =>
        `• ${p.title} — ${p.locality}, ${p.city} — ${fmtP(p.price)}${p.bhk ? ` (${p.bhk}BHK)` : ""}${p.verified ? " ✓" : ""}`
      ).join("\n");
      return `Found ${scope.length} matching properties:\n${top}${scope.length > 5 ? `\n…and ${scope.length - 5} more` : ""}`;
    }

    // Default summary
    const totalPrice = scope.reduce((s, p) => s + (p.price || 0), 0);
    const totalArea = scope.reduce((s, p) => s + (p.area_sqft || 0), 0);
    const ppsqft = totalArea > 0 ? Math.round(totalPrice / totalArea) : 0;
    const verified = scope.filter(p => p.verified).length;
    const top = scope.slice(0, 3).map(p => `${p.title} (${fmtP(p.price)})`).join(", ");
    return `Found ${scope.length} properties${ppsqft ? `, avg ₹${ppsqft}/sqft` : ""}, ${verified} verified. Top: ${top}.`;
  };

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");
    const queryText = aiQuery;

    // Try edge function first, fall back to local
    try {
      const { data, error } = await supabase.functions.invoke("ai-property-expert", {
        body: {
          query: queryText,
          context: JSON.stringify({
            city: currentCity,
            totalProperties: properties.length,
            properties: properties.slice(0, 30).map(p => ({
              title: p.title, locality: p.locality, city: p.city,
              price: p.price, area_sqft: p.area_sqft, bhk: p.bhk,
              type: p.type, verified: p.verified,
            })),
          }),
          mode: "area_lens",
        },
      });
      if (error || !data?.response) throw new Error("fallback");
      setAiResponse(data.response);
    } catch {
      setAiResponse(localResponder(queryText));
    } finally {
      setIsAiLoading(false);
      setAiQuery("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-6 left-6 z-20 w-full max-w-md"
    >
      <Card className="glass-panel p-6 space-y-4 max-h-[70vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold">AI Area Lens</h3>
              <p className="text-sm text-muted-foreground">{areaStats.areaName} · {currentCity}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <TrendingUp className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold">₹{areaStats.avgPricePerSqft}</p>
            <p className="text-xs text-muted-foreground">Avg/sqft</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <MapPin className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold">{areaStats.verifiedCount}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <Home className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold">{areaStats.totalListings}</p>
            <p className="text-xs text-muted-foreground">Listings</p>
          </div>
        </div>

        {Object.keys(areaStats.typeBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Property Types</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(areaStats.typeBreakdown).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">{type} ({count})</Badge>
              ))}
            </div>
          </div>
        )}
        {Object.keys(areaStats.bhkBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">BHK Distribution</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(areaStats.bhkBreakdown).sort().map(([bhk, count]) => (
                <Badge key={bhk} variant="secondary" className="text-xs">{bhk} ({count})</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Ask JaagaXGPT about {currentCity || "this area"}
          </div>
          <div className="flex gap-2">
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAIQuery()}
              placeholder={`e.g., Show all 3BHK in ${currentCity || "Hyderabad"}`}
              className="flex-1"
              disabled={isAiLoading}
            />
            <Button onClick={handleAIQuery} size="icon" className="glow-effect" disabled={isAiLoading}>
              {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{aiResponse}</p>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            `Show all properties in ${currentCity || "Hyderabad"}`,
            "Verified properties",
            "Luxury villas",
            "Affordable under ₹50L",
            "3BHK apartments",
          ].map(q => (
            <Badge
              key={q}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 text-xs"
              onClick={() => setAiQuery(q)}
            >
              {q}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default AIAreaLens;
