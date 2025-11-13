import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Sparkles, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { LocalityEvents } from "@/components/events/LocalityEvents";

const CommunitiesLocality = () => {
  const { city, locality } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetchLocalityDetails();
  }, [city, locality]);

  const fetchLocalityDetails = async () => {
    try {
      setLoading(true);
      
      const { data: props, error } = await supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("locality", locality)
        .eq("verified", true);

      if (error) throw error;

      setProperties(props || []);
      
      if (props && props.length > 0) {
        const avgPrice = props.reduce((sum, p) => sum + p.price, 0) / props.length;
        const trustScore = props.reduce((sum, p) => sum + (p.trust_score || 0), 0) / props.length;
        
        setStats({
          avgPrice,
          trustScore,
          propertyCount: props.length,
          appreciation: Math.random() * 15 + 2,
        });

        // Generate AI insights
        const { data: aiData } = await supabase.functions.invoke("analyze-community", {
          body: {
            city,
            locality,
            avg_price: avgPrice,
            appreciation_rate: Math.random() * 15 + 2,
            verified_projects: 0,
            verified_properties: props.length,
          },
        });

        if (aiData) setAiInsights(aiData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load locality data");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        <Button variant="ghost" onClick={() => navigate(`/communities/${city}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {city}
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="text-gradient">{locality}</span>
              </h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {city}
              </p>
            </div>
            {aiInsights?.ai_rating && (
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">AI Rating</div>
                    <div className="flex gap-1 justify-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-6 w-6 ${i < aiInsights.ai_rating ? 'fill-primary text-primary' : 'text-muted'}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {aiInsights && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <Card className="glass-panel border-primary/30 glow-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Community Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-foreground leading-relaxed">{aiInsights.ai_summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recommendation</h4>
                  <p className="text-muted-foreground">{aiInsights.ai_recommendation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Avg. Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient">{formatPrice(stats.avgPrice)}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.propertyCount}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Trust Score</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-primary/20 text-primary border-primary text-lg">
                {stats.trustScore?.toFixed(0)}/100
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Community Events Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <LocalityEvents city={city!} locality={locality!} />
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default CommunitiesLocality;
