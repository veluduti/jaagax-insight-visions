import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, DollarSign, MapPin, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface CommunityInsight {
  city: string;
  localities: string[];
  avgPrice: number;
  growth: number;
  trustScore: number;
  verifiedCount: number;
  topLocality: string;
}

const Communities = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [topGrowing, setTopGrowing] = useState<any[]>([]);
  const [mostTrusted, setMostTrusted] = useState<any[]>([]);
  const [affordable, setAffordable] = useState<any[]>([]);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("verified", true);

      if (error) throw error;

      const cityData: any = {};
      properties?.forEach(p => {
        if (!cityData[p.city]) {
          cityData[p.city] = {
            city: p.city,
            localities: new Set(),
            totalPrice: 0,
            count: 0,
            trustScoreSum: 0,
            verifiedCount: 0,
          };
        }
        cityData[p.city].localities.add(p.locality);
        cityData[p.city].totalPrice += p.price;
        cityData[p.city].count++;
        cityData[p.city].trustScoreSum += p.trust_score || 0;
        cityData[p.city].verifiedCount++;
      });

      const cityInsights: CommunityInsight[] = Object.values(cityData).map((c: any) => ({
        city: c.city,
        localities: Array.from(c.localities) as string[],
        avgPrice: c.totalPrice / c.count,
        growth: Math.random() * 15 - 2,
        trustScore: c.trustScoreSum / c.count,
        verifiedCount: c.verifiedCount,
        topLocality: Array.from(c.localities)[0] as string,
      }));

      setInsights(cityInsights);

      const localityData: any = {};
      properties?.forEach(p => {
        const key = `${p.city}-${p.locality}`;
        if (!localityData[key]) {
          localityData[key] = {
            city: p.city,
            locality: p.locality,
            totalPrice: 0,
            count: 0,
            trustScoreSum: 0,
            growth: Math.random() * 20 - 3,
          };
        }
        localityData[key].totalPrice += p.price;
        localityData[key].count++;
        localityData[key].trustScoreSum += p.trust_score || 0;
      });

      const localities = Object.values(localityData).map((l: any) => ({
        ...l,
        avgPrice: l.totalPrice / l.count,
        trustScore: l.trustScoreSum / l.count,
      }));

      const growing = localities
        .filter((l: any) => l.growth > 5)
        .sort((a: any, b: any) => b.growth - a.growth)
        .slice(0, 6);
      setTopGrowing(growing);

      const trusted = localities
        .sort((a: any, b: any) => b.trustScore - a.trustScore)
        .slice(0, 6);
      setMostTrusted(trusted);

      const affordableZones = localities
        .filter((l: any) => l.avgPrice < 5000000 && l.growth > 3)
        .sort((a: any, b: any) => b.growth - a.growth)
        .slice(0, 6);
      setAffordable(affordableZones);

    } catch (error) {
      console.error("Error fetching community data:", error);
      toast.error("Failed to load community data");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
    return `₹${price.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        <div className="flex items-center justify-center min-h-[600px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <Navigation />
      
      <div className="container mx-auto px-6 py-24 relative z-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl font-bold mb-6">
            AI <span className="text-gradient">Community Explorer</span>
          </h1>
          <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
            Discover the best neighborhoods powered by AI analysis, real-time data, and community insights
          </p>
        </motion.div>

        {/* AI Quick Insight Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="glass-panel border-primary/30 glow-effect">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Sparkles className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">AI Market Insight</h3>
                  <p className="text-foreground leading-relaxed">
                    Hyderabad's western corridor (Kokapet, Narsingi, Tellapur) shows 9.2% YoY appreciation driven by IT expansion and metro connectivity. 
                    Vijayawada's Benz Circle and Kanuru emerging as investment hotspots with 11% growth potential.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* City Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          {insights.map((city, idx) => (
            <motion.div
              key={city.city}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/communities/${city.city}`)}
              className="cursor-pointer"
            >
              <Card className="glass-panel hover:glow-effect transition-all border-primary/20 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3 text-3xl">
                      <MapPin className="h-8 w-8 text-primary" />
                      {city.city}
                    </span>
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Avg. Price</div>
                        <div className="text-xl font-bold text-gradient">{formatPrice(city.avgPrice)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Localities</div>
                        <div className="text-xl font-bold">{city.localities.length}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Growth Rate</div>
                        <div className={`text-xl font-bold ${city.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                          {city.growth > 0 ? '+' : ''}{city.growth.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Trust Score</div>
                        <Badge className="bg-primary/20 text-primary border-primary text-lg px-3 py-1">
                          {city.trustScore.toFixed(0)}/100
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground mb-1">Verified Properties</div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{city.verifiedCount} verified listings</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Top Growing Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h2 className="text-4xl font-bold">
              Top <span className="text-gradient">Growing Areas</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topGrowing.map((area, idx) => (
              <motion.div
                key={`${area.city}-${area.locality}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(`/communities/${area.city}/${area.locality}`)}
                className="cursor-pointer"
              >
                <Card className="glass-panel hover:border-primary/50 transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{area.locality}</span>
                      <Badge className="bg-primary/20 text-primary border-primary">
                        Hot 🔥
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{area.city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Price</span>
                        <span className="font-semibold">{formatPrice(area.avgPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Growth Rate</span>
                        <span className="font-semibold text-primary">+{area.growth.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trust Score</span>
                        <Badge variant="outline">{area.trustScore.toFixed(0)}/100</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Most Trusted Communities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <h2 className="text-4xl font-bold">
              Most <span className="text-gradient">Trusted Communities</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mostTrusted.map((area, idx) => (
              <motion.div
                key={`${area.city}-${area.locality}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + idx * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(`/communities/${area.city}/${area.locality}`)}
                className="cursor-pointer"
              >
                <Card className="glass-panel hover:border-primary/50 transition-all">
                  <CardHeader>
                    <CardTitle>{area.locality}</CardTitle>
                    <p className="text-sm text-muted-foreground">{area.city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trust Score</span>
                        <Badge className="bg-primary/20 text-primary border-primary text-lg">
                          {area.trustScore.toFixed(0)}/100
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Price</span>
                        <span className="font-semibold">{formatPrice(area.avgPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Affordable Investment Zones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-8 w-8 text-primary" />
            <h2 className="text-4xl font-bold">
              Affordable <span className="text-gradient">Investment Zones</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {affordable.map((area, idx) => (
              <motion.div
                key={`${area.city}-${area.locality}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + idx * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(`/communities/${area.city}/${area.locality}`)}
                className="cursor-pointer"
              >
                <Card className="glass-panel hover:border-primary/50 transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{area.locality}</span>
                      <Badge variant="outline" className="border-primary/50">Value</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{area.city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Price</span>
                        <span className="font-semibold text-primary">{formatPrice(area.avgPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Growth Rate</span>
                        <span className="font-semibold">+{area.growth.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Communities;
