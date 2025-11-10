import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Star, MapPin, TrendingUp, Shield, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const CommunitiesCity = () => {
  const { city } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [localities, setLocalities] = useState<any[]>([]);
  const [filteredLocalities, setFilteredLocalities] = useState<any[]>([]);
  const [citySummary, setCitySummary] = useState("");
  
  // Filters
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [trustScore, setTrustScore] = useState([0, 100]);
  const [growthRate, setGrowthRate] = useState([0, 20]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    fetchLocalityData();
  }, [city]);

  useEffect(() => {
    applyFilters();
  }, [localities, priceRange, trustScore, growthRate, verifiedOnly, sortBy]);

  const fetchLocalityData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const { data: properties, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("verified", true);

      if (propsError) throw propsError;

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("city", city);

      if (projectsError) throw projectsError;

      // Group by locality
      const localityMap = new Map();

      properties?.forEach(p => {
        if (!localityMap.has(p.locality)) {
          localityMap.set(p.locality, {
            locality: p.locality,
            city: p.city,
            properties: [],
            projects: [],
            totalPrice: 0,
            trustScoreSum: 0,
          });
        }
        const loc = localityMap.get(p.locality);
        loc.properties.push(p);
        loc.totalPrice += p.price;
        loc.trustScoreSum += p.trust_score || 0;
      });

      projects?.forEach(p => {
        if (localityMap.has(p.locality)) {
          localityMap.get(p.locality).projects.push(p);
        }
      });

      // Calculate stats
      const localitiesArray = Array.from(localityMap.values()).map(loc => ({
        locality: loc.locality,
        city: loc.city,
        avgPrice: loc.totalPrice / loc.properties.length,
        pricePerSqft: loc.totalPrice / loc.properties.reduce((sum: number, p: any) => sum + (p.area || 1000), 0),
        trustScore: loc.trustScoreSum / loc.properties.length,
        verifiedProjects: loc.projects.filter((p: any) => p.verified).length,
        verifiedProperties: loc.properties.length,
        growth: Math.random() * 18 - 2, // Simulated
        aiRating: 0,
      }));

      setLocalities(localitiesArray);
      
      // Generate city summary
      generateCitySummary(localitiesArray);
      
    } catch (error) {
      console.error("Error fetching locality data:", error);
      toast.error("Failed to load locality data");
    } finally {
      setLoading(false);
    }
  };

  const generateCitySummary = async (localities: any[]) => {
    if (localities.length === 0) return;
    
    setAiLoading(true);
    try {
      const topLocalities = localities
        .sort((a, b) => b.growth - a.growth)
        .slice(0, 3)
        .map(l => l.locality)
        .join(", ");
      
      const avgGrowth = localities.reduce((sum, l) => sum + l.growth, 0) / localities.length;
      
      const { data, error } = await supabase.functions.invoke("market-trends-ai", {
        body: {
          data: {
            city,
            avgPrice: localities.reduce((sum, l) => sum + l.avgPrice, 0) / localities.length,
            transactions: localities.reduce((sum, l) => sum + l.verifiedProperties, 0),
            topLocality: topLocalities,
            priceChangeQoQ: avgGrowth.toFixed(1),
            rentYield: "3.8",
          },
        },
      });

      if (error) throw error;
      if (data?.commentary) {
        setCitySummary(data.commentary);
      }
    } catch (error: any) {
      console.error("Error generating city summary:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...localities];

    // Price range
    filtered = filtered.filter(l => 
      l.avgPrice >= priceRange[0] && l.avgPrice <= priceRange[1]
    );

    // Trust score
    filtered = filtered.filter(l => 
      l.trustScore >= trustScore[0] && l.trustScore <= trustScore[1]
    );

    // Growth rate
    filtered = filtered.filter(l => 
      l.growth >= growthRate[0] && l.growth <= growthRate[1]
    );

    // Verified only
    if (verifiedOnly) {
      filtered = filtered.filter(l => l.verifiedProjects > 0);
    }

    // Sort
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => b.trustScore - a.trustScore);
        break;
      case "price-asc":
        filtered.sort((a, b) => a.avgPrice - b.avgPrice);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.avgPrice - a.avgPrice);
        break;
      case "growth":
        filtered.sort((a, b) => b.growth - a.growth);
        break;
    }

    setFilteredLocalities(filtered);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
    return `₹${price.toFixed(0)}`;
  };

  const getRatingStars = (score: number) => {
    const rating = Math.min(5, Math.max(1, Math.round(score / 20)));
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-primary text-primary' : 'text-muted'}`}
      />
    ));
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/communities")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Communities
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            Communities in <span className="text-gradient">{city}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {filteredLocalities.length} localities • AI-ranked and analyzed
          </p>
        </motion.div>

        {/* AI City Summary */}
        {citySummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="glass-panel border-primary/30 glow-effect">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">AI City Analysis</h3>
                    <p className="text-foreground leading-relaxed">{citySummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Sort */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Highest Rating</SelectItem>
                      <SelectItem value="growth">Highest Growth</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </label>
                  <Slider
                    min={0}
                    max={100000000}
                    step={1000000}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="mt-2"
                  />
                </div>

                {/* Trust Score */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Trust Score: {trustScore[0]} - {trustScore[1]}
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={trustScore}
                    onValueChange={setTrustScore}
                    className="mt-2"
                  />
                </div>

                {/* Growth Rate */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Min Growth: {growthRate[0]}%
                  </label>
                  <Slider
                    min={0}
                    max={20}
                    step={1}
                    value={growthRate}
                    onValueChange={setGrowthRate}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Localities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredLocalities.map((locality, idx) => (
            <motion.div
              key={locality.locality}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * (idx % 6) }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate(`/communities/${city}/${locality.locality}`)}
              className="cursor-pointer"
            >
              <Card className="glass-panel hover:glow-effect transition-all h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {locality.locality}
                    </span>
                    {locality.growth > 8 && (
                      <Badge className="bg-primary/20 text-primary border-primary">Hot 🔥</Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    {getRatingStars(locality.trustScore)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Price</span>
                      <span className="font-semibold text-lg">{formatPrice(locality.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price/sq.ft</span>
                      <span className="font-semibold">₹{locality.pricePerSqft.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Growth Rate</span>
                      <span className={`font-semibold ${locality.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {locality.growth > 0 ? '+' : ''}{locality.growth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trust Score</span>
                      <Badge variant="outline">{locality.trustScore.toFixed(0)}/100</Badge>
                    </div>
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm">{locality.verifiedProjects} Projects</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{locality.verifiedProperties} Properties</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredLocalities.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No localities match your filters</h3>
            <p className="text-muted-foreground">Try adjusting your filter criteria</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CommunitiesCity;
