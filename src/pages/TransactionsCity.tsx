import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Building2, MapPin, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AIInsightsChat } from "@/components/transactions/AIInsightsChat";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";

const TransactionsCity = () => {
  const { city } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [localities, setLocalities] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [cityStats, setCityStats] = useState({
    avgPrice: 0,
    totalProperties: 0,
    appreciationRate: 0,
    topLocality: "",
  });

  useEffect(() => {
    fetchCityData();
  }, [city]);

  const fetchCityData = async () => {
    try {
      setLoading(true);
      
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("verified", true);

      if (error) throw error;

      if (properties && properties.length > 0) {
        // Calculate stats by locality
        const localityData = properties.reduce((acc: any, p: any) => {
          if (!acc[p.locality]) {
            acc[p.locality] = {
              locality: p.locality,
              count: 0,
              totalPrice: 0,
              avgTrustScore: 0,
              properties: [],
            };
          }
          acc[p.locality].count++;
          acc[p.locality].totalPrice += p.price;
          acc[p.locality].avgTrustScore += p.trust_score || 0;
          acc[p.locality].properties.push(p);
          return acc;
        }, {});

        const localitiesArray = Object.values(localityData).map((l: any) => ({
          ...l,
          avgPrice: l.totalPrice / l.count,
          avgTrustScore: l.avgTrustScore / l.count,
          growth: Math.random() * 15 - 2, // Simulated growth
        })).sort((a: any, b: any) => b.avgPrice - a.avgPrice);

        setLocalities(localitiesArray);

        const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;
        const topLocality = localitiesArray[0]?.locality || "N/A";
        
        setCityStats({
          avgPrice,
          totalProperties: properties.length,
          appreciationRate: Math.random() * 10 + 2, // Simulated
          topLocality,
        });
      }
    } catch (error) {
      console.error("Error fetching city data:", error);
      toast.error("Failed to load city data");
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-trends-ai", {
        body: {
          data: {
            city,
            avgPrice: cityStats.avgPrice,
            transactions: cityStats.totalProperties,
            topLocality: cityStats.topLocality,
            priceChangeQoQ: cityStats.appreciationRate.toFixed(1),
            rentYield: "3.8",
          },
        },
      });

      if (error) throw error;
      if (data?.commentary) {
        setAiSummary(data.commentary);
        toast.success("AI analysis generated!");
      }
    } catch (error: any) {
      console.error("Error generating AI summary:", error);
      if (error.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes("402")) {
        toast.error("Please add credits to continue using AI features.");
      } else {
        toast.error("Failed to generate AI insights");
      }
    } finally {
      setAiLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/transactions")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gradient">{city}</span> Market Analysis
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive insights and trends for {city}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="glass-panel glow-effect">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gradient">{formatPrice(cityStats.avgPrice)}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cityStats.totalProperties}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Appreciation Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-primary">+{cityStats.appreciationRate.toFixed(1)}%</span>
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Locality</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="border-primary text-primary text-lg px-4 py-2">
                {cityStats.topLocality}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI City Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!aiSummary ? (
                <div className="text-center py-6">
                  <Button onClick={generateAISummary} disabled={aiLoading}>
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Analysis
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30">
                  <p className="text-foreground leading-relaxed text-lg">{aiSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Localities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold mb-6">
            Localities in <span className="text-gradient">{city}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localities.map((locality, idx) => (
              <motion.div
                key={locality.locality}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * idx }}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/transactions/${city}/${locality.locality}`)}
                className="cursor-pointer"
              >
                <Card className="glass-panel hover:glow-effect transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {locality.locality}
                      </span>
                      {locality.growth > 5 && (
                        <Badge className="bg-primary/20 text-primary border-primary">Hot 🔥</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Price</span>
                        <span className="font-semibold text-lg">{formatPrice(locality.avgPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Properties</span>
                        <span className="font-semibold">{locality.count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Growth Rate</span>
                        <span className={`font-semibold ${locality.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                          {locality.growth > 0 ? '+' : ''}{locality.growth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trust Score</span>
                        <Badge variant="outline">{locality.avgTrustScore.toFixed(0)}/100</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <AIInsightsChat />
      <Footer />
    </div>
  );
};

export default TransactionsCity;
