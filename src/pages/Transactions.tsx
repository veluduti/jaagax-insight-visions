import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Sparkles, Loader2, DollarSign, Home, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AIInsightsChat } from "@/components/transactions/AIInsightsChat";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

interface MarketData {
  month: string;
  avgPrice: number;
  transactions: number;
  rentYield?: number;
}

const Transactions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("Hyderabad");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [priceData, setPriceData] = useState<MarketData[]>([]);
  const [rentYieldData, setRentYieldData] = useState<MarketData[]>([]);
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [cityOverview, setCityOverview] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgPrice: 0,
    totalTransactions: 0,
    priceChangeQoQ: 0,
    topLocality: "",
    rentYield: 0,
    confidenceIndex: 0,
  });

  const cities = ["Hyderabad", "Vijayawada"];
  const propertyTypes = ["all", "apartment", "villa", "plot", "commercial"];
  const areas = ["all", "Kokapet", "Narsingi", "Gachibowli", "Kondapur", "Tellapur", "Benz Circle", "Kanuru"];

  useEffect(() => {
    fetchMarketData();
    fetchCityOverview();
  }, [selectedCity, selectedType, selectedArea]);

  const fetchCityOverview = async () => {
    try {
      const citiesData = await Promise.all(
        cities.map(async (city) => {
          const { data, error } = await supabase
            .from("properties")
            .select("*")
            .eq("city", city)
            .eq("verified", true);

          if (error) throw error;

          const avgPrice = data && data.length > 0 ? data.reduce((sum, p) => sum + p.price, 0) / data.length : 0;
          const growth = Math.random() * 15 - 2; // Simulated growth
          
          return {
            city,
            avgPrice,
            totalProperties: data?.length || 0,
            growth,
            confidence: Math.round(70 + Math.random() * 25),
          };
        })
      );

      setCityOverview(citiesData);
    } catch (error) {
      console.error("Error fetching city overview:", error);
    }
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      // Build query
      let query = supabase
        .from("properties")
        .select("*")
        .eq("city", selectedCity)
        .eq("verified", true);

      if (selectedType !== "all") {
        query = query.eq("type", selectedType as any);
      }

      if (selectedArea !== "all") {
        query = query.eq("locality", selectedArea);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data for charts
      if (data && data.length > 0) {
        // Calculate average price and stats
        const avgPrice = data.reduce((sum, p) => sum + p.price, 0) / data.length;
        const totalTransactions = data.length;

        // Get top locality
        const localityCounts = data.reduce((acc: any, p) => {
          acc[p.locality] = (acc[p.locality] || 0) + 1;
          return acc;
        }, {});
        const topLocality = Object.entries(localityCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A";

        // Simulate QoQ change (in real app, compare with historical data)
        const priceChangeQoQ = Math.random() * 20 - 5; // -5% to +15%

        // Calculate rent yield (simplified: assume 3-4% for residential)
        const rentYield = selectedType === "commercial" ? 6.5 : 3.8;

        setStats({
          avgPrice,
          totalTransactions,
          priceChangeQoQ,
          topLocality,
          rentYield,
          confidenceIndex: Math.round(75 + Math.random() * 20),
        });

        // Create mock monthly data for charts (last 6 months)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        const mockPriceData: MarketData[] = months.map((month, i) => ({
          month,
          avgPrice: avgPrice * (0.92 + i * 0.015), // Simulate growth
          transactions: Math.floor(totalTransactions / 6) + Math.floor(Math.random() * 20),
          rentYield: rentYield + (Math.random() - 0.5),
        }));

        setPriceData(mockPriceData);
        setRentYieldData(mockPriceData);
      } else {
        setPriceData([]);
        setRentYieldData([]);
        setStats({
          avgPrice: 0,
          totalTransactions: 0,
          priceChangeQoQ: 0,
          topLocality: "N/A",
          rentYield: 0,
          confidenceIndex: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
      toast.error("Failed to load market data");
    } finally {
      setLoading(false);
    }
  };

  const generateAICommentary = async () => {
    if (stats.avgPrice === 0) {
      toast.error("No data available to analyze");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-trends-ai", {
        body: {
          data: {
            city: selectedCity,
            avgPrice: stats.avgPrice,
            transactions: stats.totalTransactions,
            topLocality: stats.topLocality,
            priceChangeQoQ: stats.priceChangeQoQ.toFixed(1),
            rentYield: stats.rentYield.toFixed(1),
          },
        },
      });

      if (error) throw error;

      if (data?.commentary) {
        setAiCommentary(data.commentary);
        toast.success("AI analysis generated!");
      }
    } catch (error: any) {
      console.error("Error generating AI commentary:", error);
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
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)}Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)}L`;
    }
    return `₹${price.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      
      <div className="container mx-auto px-6 py-24 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold mb-4">
            Transactions & <span className="text-gradient">Market Intelligence</span>
          </h1>
          <p className="text-muted-foreground text-xl">
            AI-Powered Real Estate Analytics Platform
          </p>
        </motion.div>

        {/* City Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {cityOverview.map((city, idx) => (
            <motion.div
              key={city.city}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/transactions/${city.city}`)}
              className="cursor-pointer"
            >
              <Card className="glass-panel hover:glow-effect transition-all border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-2xl">
                      <MapPin className="h-6 w-6 text-primary" />
                      {city.city}
                    </span>
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Avg. Price</div>
                      <div className="text-xl font-bold text-gradient">{formatPrice(city.avgPrice)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Properties</div>
                      <div className="text-xl font-bold">{city.totalProperties}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Growth Rate</div>
                      <div className={`text-xl font-bold ${city.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {city.growth > 0 ? '+' : ''}{city.growth.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">AI Confidence</div>
                      <Badge className="bg-primary/20 text-primary border-primary">{city.confidence}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 mb-8 rounded-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder="Select Area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area === "all" ? "All Areas" : area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
            >
              <Card className="glass-panel glow-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Sale Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gradient">{formatPrice(stats.avgPrice)}</div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                    <Home className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Price Change QoQ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {stats.priceChangeQoQ > 0 ? "+" : ""}
                        {stats.priceChangeQoQ.toFixed(1)}%
                      </span>
                      {stats.priceChangeQoQ > 0 ? (
                        <TrendingUp className="h-5 w-5 text-primary" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Rent Yield
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.rentYield.toFixed(1)}%</div>
                    <Badge variant="outline" className="border-primary/50">
                      {stats.topLocality}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    AI Confidence Index
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">{stats.confidenceIndex}%</div>
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Average Sale Price Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle>Average Sale Price Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={priceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(value) => formatPrice(value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [formatPrice(value), "Avg Price"]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="avgPrice" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Avg Sale Price"
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Rent Yield Chart */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle>Rent Yield Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={rentYieldData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, "Rent Yield"]}
                        />
                        <Legend />
                        <Bar 
                          dataKey="rentYield" 
                          fill="hsl(var(--primary))" 
                          name="Rent Yield %"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* AI Commentary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Market Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!aiCommentary ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground mb-4">
                        Generate AI-powered insights about market trends
                      </p>
                      <Button onClick={generateAICommentary} disabled={aiLoading || stats.avgPrice === 0}>
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
                    <div className="space-y-4">
                      <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                        <p className="text-foreground leading-relaxed">{aiCommentary}</p>
                      </div>
                      <Button variant="outline" onClick={generateAICommentary} disabled={aiLoading}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      <AIInsightsChat />
      <Footer />
    </div>
  );
};

export default Transactions;
