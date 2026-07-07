import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, MapPin, Building2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";

const MIN_SAMPLE = 3; // minimum live listings required to show computed stats

interface LiveProperty {
  city: string | null;
  locality: string | null;
  price: number | null;
  area_sqft: number | null;
}

const formatINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const MarketIntelligence = () => {
  const navigate = useNavigate();
  const { savedLocation } = useLocation();
  const city = savedLocation?.city || null;

  const { data, isLoading } = useQuery({
    queryKey: ["market-intelligence", city],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("city,locality,price,area_sqft")
        .eq("is_live", true);
      if (city) query = query.ilike("city", city);
      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return (data ?? []) as LiveProperty[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rows = data ?? [];
  const priceRows = rows.filter(
    (r) => typeof r.price === "number" && r.price > 0 && typeof r.area_sqft === "number" && r.area_sqft! > 0
  );

  const avgPricePerSqft = priceRows.length
    ? Math.round(priceRows.reduce((s, r) => s + r.price! / r.area_sqft!, 0) / priceRows.length)
    : null;

  // Group by locality
  const localityMap = new Map<string, { count: number; priceSum: number; priceCount: number }>();
  rows.forEach((r) => {
    const key = (r.locality || "").trim();
    if (!key) return;
    const entry = localityMap.get(key) || { count: 0, priceSum: 0, priceCount: 0 };
    entry.count += 1;
    if (r.price && r.area_sqft && r.area_sqft > 0) {
      entry.priceSum += r.price / r.area_sqft;
      entry.priceCount += 1;
    }
    localityMap.set(key, entry);
  });

  const trendingAreas = Array.from(localityMap.entries())
    .map(([name, v]) => ({
      name,
      listings: v.count,
      avgPricePerSqft: v.priceCount > 0 ? Math.round(v.priceSum / v.priceCount) : null,
    }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 4);

  const totalListings = rows.length;
  const hotZonesCount = localityMap.size;

  const hasEnoughData = totalListings >= MIN_SAMPLE;

  return (
    <section className="section-spacing relative bg-secondary/10" id="market-insights">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Market <span className="text-gradient">Intelligence</span>
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            Live insights from verified listings{city ? ` in ${city}` : ""}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-lg mb-xl">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-md h-40 animate-pulse bg-secondary/30" />
            ))}
          </div>
        ) : !hasEnoughData ? (
          <Card className="card-base p-lg text-center max-w-2xl mx-auto">
            <Info className="h-8 w-8 text-primary mx-auto mb-md" />
            <h3 className="text-xl font-semibold mb-sm">Insights coming soon</h3>
            <p className="text-muted-foreground">
              Real-time market insights will be available once sufficient verified market data exists
              {city ? ` for ${city}` : ""}.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-lg mb-xl">
              {avgPricePerSqft !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="card-hover p-md">
                    <div className="flex items-start justify-between mb-md">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                        <BarChart3 className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">{city || "All markets"}</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-sm text-gradient">
                      {formatINR(avgPricePerSqft)}/sqft
                    </h3>
                    <p className="text-muted-foreground mb-sm">Average listed price</p>
                    <p className="text-xs text-muted-foreground">
                      Based on {priceRows.length} verified listing{priceRows.length === 1 ? "" : "s"}
                    </p>
                  </Card>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Card className="card-hover p-md">
                  <div className="flex items-start justify-between mb-md">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                      <Building2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Live now</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-sm text-gradient">{totalListings}</h3>
                  <p className="text-muted-foreground mb-sm">Verified listings</p>
                  <p className="text-xs text-muted-foreground">
                    {city ? `Available in ${city}` : "Across all markets"}
                  </p>
                </Card>
              </motion.div>

              {hotZonesCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="card-hover p-md">
                    <div className="flex items-start justify-between mb-md">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                        <MapPin className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">Active localities</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-sm text-gradient">{hotZonesCount}</h3>
                    <p className="text-muted-foreground mb-sm">Localities with listings</p>
                    <p className="text-xs text-muted-foreground">Explore each on the map</p>
                  </Card>
                </motion.div>
              )}
            </div>

            {trendingAreas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Card className="card-base p-md">
                  <h3 className="text-xl md:text-2xl font-bold mb-lg">
                    Top Localities{city ? ` in ${city}` : ""}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    {trendingAreas.map((area, index) => (
                      <motion.div
                        key={area.name}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        className="p-md rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all cursor-pointer hover-lift"
                        onClick={() => navigate("/map")}
                      >
                        <div className="flex items-center justify-between mb-sm">
                          <h4 className="font-semibold truncate pr-2">{area.name}</h4>
                          <span className="text-primary text-sm font-bold whitespace-nowrap">
                            {area.listings} live
                          </span>
                        </div>
                        {area.avgPricePerSqft !== null ? (
                          <p className="text-sm text-muted-foreground">
                            {formatINR(area.avgPricePerSqft)}/sqft avg
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Price data pending</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mt-lg"
            >
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 hover:bg-primary/10 hover:border-primary"
                onClick={() => navigate("/map")}
              >
                Explore Full Market Map
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};

export default MarketIntelligence;
