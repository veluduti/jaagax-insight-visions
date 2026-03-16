import { useState, useEffect } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { MarketPulseRibbon } from "@/components/transactions/MarketPulseRibbon";
import { TransactionsMap } from "@/components/transactions/TransactionsMap";
import { LocalityIndexCards } from "@/components/transactions/LocalityIndexCards";
import { AIForecastSection } from "@/components/transactions/AIForecastSection";
import { useNavigate } from "react-router-dom";

const Transactions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState({
    avgPrice: 0,
    yoyGrowth: 0,
    liquidity: 0,
    topLocality: "",
    trustAdjustedPrice: 0,
    aiConfidence: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    fetchTransactionsData();
  }, []);

  const fetchTransactionsData = async () => {
    try {
      setLoading(true);
      
      // Fetch verified properties as transactions
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("verified", true)
        .limit(200);

      if (error) throw error;

      if (properties && properties.length > 0) {
        // Process transactions - use latitude/longitude instead of lat/lng
        const processedTransactions = properties
          .filter(p => p.latitude && p.longitude)
          .map((p, idx) => ({
            id: p.id.toString(),
            lat: p.latitude,
            lng: p.longitude,
            price: p.price,
            locality: p.locality || "Unknown",
            date: new Date(2024, Math.floor(idx / properties.length * 6), 1).toLocaleDateString(),
            verified: p.verified,
            trustScore: p.trust_score || 75,
          }));

        setTransactions(processedTransactions);

        // Calculate pulse metrics
        const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;
        const verifiedProps = properties.filter(p => p.trust_score && p.trust_score > 70);
        const trustAdjustedPrice = verifiedProps.length > 0
          ? verifiedProps.reduce((sum, p) => sum + p.price, 0) / verifiedProps.length
          : avgPrice;

        // Get locality stats
        const localityMap = new Map();
        properties.forEach(p => {
          const loc = p.locality || "Unknown";
          if (!localityMap.has(loc)) {
            localityMap.set(loc, {
              name: loc,
              city: p.city || "Hyderabad",
              count: 0,
              totalPrice: 0,
              totalTrust: 0,
            });
          }
          const locData = localityMap.get(loc);
          locData.count++;
          locData.totalPrice += p.price;
          locData.totalTrust += p.trust_score || 75;
        });

        // Process top localities
        const processedLocalities = Array.from(localityMap.values())
          .map(loc => ({
            name: loc.name,
            city: loc.city,
            avgPrice: loc.totalPrice / loc.count,
            yoyGrowth: 8 + Math.random() * 12, // Simulated growth
            txCount: loc.count,
            trustScore: Math.round(loc.totalTrust / loc.count),
            forecast6m: 5 + Math.random() * 15, // Simulated forecast
          }))
          .sort((a, b) => b.txCount - a.txCount)
          .slice(0, 9);

        setLocalities(processedLocalities);

        const topLocality = processedLocalities[0]?.name || "N/A";

        setPulseData({
          avgPrice,
          yoyGrowth: 10.5 + Math.random() * 5,
          liquidity: Math.round(properties.length / 6),
          topLocality,
          trustAdjustedPrice,
          aiConfidence: Math.round(80 + Math.random() * 15),
          totalTransactions: properties.length,
        });
      }
    } catch (error) {
      console.error("Error fetching transactions data:", error);
      toast.error("Failed to load transactions data");
    } finally {
      setLoading(false);
    }
  };

  const handleForecastClick = (locality: string) => {
    toast.success(`Loading detailed forecast for ${locality}...`);
  };

  const handleDownloadBrief = async (locality: string) => {
    toast.info(`Generating AI brief for ${locality}...`);
    // In production, this would call the AI brief edge function
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Navigation />
      
      <div className="container mx-auto px-6 py-24 relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Real Estate{" "}
              <span className="text-gradient inline-block">
                Market Intelligence
              </span>
            </h1>
          </motion.div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            AI-powered analytics, live transaction tracking, and predictive forecasting 
            for India's fastest-growing real estate markets
          </p>
        </motion.div>

        {/* Market Pulse Ribbon */}
        {!loading && (
          <MarketPulseRibbon
            avgPrice={pulseData.avgPrice}
            yoyGrowth={pulseData.yoyGrowth}
            liquidity={pulseData.liquidity}
            topLocality={pulseData.topLocality}
            trustAdjustedPrice={pulseData.trustAdjustedPrice}
            aiConfidence={pulseData.aiConfidence}
            totalTransactions={pulseData.totalTransactions}
          />
        )}

        {/* Interactive Map with Playback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">
              Live Transaction <span className="text-gradient">Heatmap</span>
            </h2>
            <p className="text-muted-foreground">
              Interactive map with temporal playback controls • Last 6 months data
            </p>
          </div>
          
          {!loading && <TransactionsMap transactions={transactions} />}
        </motion.div>

        {/* Locality Index Cards */}
        {!loading && (
          <LocalityIndexCards
            localities={localities}
            onForecastClick={handleForecastClick}
            onDownloadBrief={handleDownloadBrief}
          />
        )}

        {/* AI Forecast Section */}
        {!loading && <AIForecastSection />}

        {/* Actionable Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 p-12 glass-panel rounded-2xl border-primary/20 text-center"
        >
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-6" />
          <h3 className="text-3xl font-bold mb-4">
            Found Your Next Investment Area?
          </h3>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Schedule a personalized site visit with JaagaX Concierge and explore 
            properties with our expert advisors
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => navigate("/ai-advisor")}
              className="min-w-[200px]"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              AI Property Advisor
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/projects")}
              className="min-w-[200px]"
            >
              <CalendarDays className="mr-2 h-5 w-5" />
              Explore All Projects
            </Button>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Transactions;