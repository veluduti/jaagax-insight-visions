import { useState } from "react";
import { motion } from "framer-motion";
import { Section, Eyebrow, H1, H2, Lede, StatBlock, EditorialCard, CTA } from "@/features/natural-living/ui";
import { Sparkles, Zap, Brain, TrendingUp, Bell, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveCommunityPulse from "@/components/community/LiveCommunityPulse";
import Navigation from "@/components/Navigation";
import PredictivePriceAlerts from "@/components/alerts/PredictivePriceAlerts";
import SmartVisitCluster from "@/components/visit/SmartVisitCluster";
import VoiceSearch from "@/components/search/VoiceSearch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const InnovationHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pulse");

  const handleVoiceSearch = (query: string, filters?: any) => {
    toast.success(`Searching: "${query}"`);
    // Navigate to search with filters
    const params = new URLSearchParams();
    if (filters?.city) params.set("city", filters.city);
    if (filters?.locality) params.set("locality", filters.locality);
    if (filters?.bhk) params.set("bhk", filters.bhk.toString());
    if (filters?.maxBudget) params.set("maxPrice", filters.maxBudget.toString());
    navigate(`/search?${params.toString()}`);
  };

  const handleScheduleCluster = (cluster: any) => {
    toast.success(`Tour scheduled for ${cluster.date} at ${cluster.timeSlot}`);
  };

  const features = [
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI Match Scores",
      description: "Every property shows why it matches your preferences",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Smart Visit Clustering",
      description: "AI-optimized routes for efficient property tours",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Voice Search",
      description: "Natural language property search with AI parsing",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Live Community Pulse",
      description: "Real-time activity in your target neighborhoods",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: "Predictive Price Alerts",
      description: "AI forecasts price movements before they happen",
      gradient: "from-amber-500 to-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 0% 0%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, hsl(var(--primary)) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 gap-2" variant="secondary">
              <Sparkles className="h-3 w-3" />
              Platform Innovation Hub
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Experience the Future of
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {" "}
                Real Estate
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              AI-powered features that make property search smarter, faster, and more personalized
            </p>

            {/* Voice Search Demo */}
            <div className="flex items-center justify-center gap-4">
              <VoiceSearch onSearchResult={handleVoiceSearch} />
              <span className="text-sm text-muted-foreground">
                Try voice search: "3 BHK in Gachibowli under 2 crore"
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-4 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Interactive Demos */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pulse" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Pulse
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Price Alerts
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-2">
              <Zap className="h-4 w-4" />
              Smart Visits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pulse">
            <LiveCommunityPulse />
          </TabsContent>

          <TabsContent value="alerts">
            <PredictivePriceAlerts />
          </TabsContent>

          <TabsContent value="visits">
            <SmartVisitCluster savedProperties={[]} onScheduleCluster={handleScheduleCluster} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default InnovationHub;
