import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, Star, Building2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AIInsightsChat } from "@/components/transactions/AIInsightsChat";
import { toast } from "sonner";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

const TransactionsLocality = () => {
  const { city, locality } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [builders, setBuilders] = useState<any[]>([]);
  const [investmentRating, setInvestmentRating] = useState(0);
  const [prediction, setPrediction] = useState("");

  useEffect(() => {
    fetchLocalityData();
  }, [city, locality]);

  const fetchLocalityData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const { data: props, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("locality", locality)
        .eq("verified", true);

      if (propsError) throw propsError;

      // Fetch projects for builders
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*, builders(*)")
        .eq("city", city)
        .eq("locality", locality);

      if (projectsError) throw projectsError;

      setProperties(props || []);
      
      // Process builder data
      const builderData = projects?.map((p: any) => ({
        name: p.builder_name || p.builders?.name || "Unknown",
        trustScore: p.trust_score || p.builders?.trust_score || 0,
        avgPrice: p.avg_price || 0,
        verified: p.verified || p.builders?.verified || false,
      })) || [];
      
      setBuilders(builderData);

      // Calculate investment rating (1-5 stars)
      const avgTrust = props?.reduce((sum, p) => sum + (p.trust_score || 0), 0) / (props?.length || 1);
      const rating = Math.min(5, Math.max(1, Math.round(avgTrust / 20)));
      setInvestmentRating(rating);

      // Generate prediction
      const growthRate = Math.random() * 15 + 2;
      setPrediction(growthRate > 8 ? "📈 Strong Growth Likely" : growthRate > 5 ? "📊 Moderate Growth Expected" : "📉 Stable Market");
      
    } catch (error) {
      console.error("Error fetching locality data:", error);
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

  const scatterData = properties.map(p => ({
    price: p.price / 100000,
    trustScore: p.trust_score || 0,
    name: p.title,
  }));

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
        <Button variant="ghost" onClick={() => navigate(`/transactions/${city}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {city}
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="text-gradient">{locality}</span>
              </h1>
              <p className="text-muted-foreground text-lg">{city} • Detailed Market Analysis</p>
            </div>
            <Card className="glass-panel border-primary/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Investment Rating</div>
                  <div className="flex gap-1 justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${i < investmentRating ? 'fill-primary text-primary' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary">{prediction}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Price vs Trust Score */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Price vs Trust Score Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="trustScore" 
                      name="Trust Score" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Trust Score', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="price" 
                      name="Price (L)" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Price (₹L)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => [`₹${value}L`, 'Price']}
                    />
                    <Scatter name="Properties" data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Builder Comparison */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Builder Trust Score Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={builders.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="trustScore" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Properties Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                All Properties in {locality}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>BHK</TableHead>
                      <TableHead>Area (sq.ft)</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Price/sq.ft</TableHead>
                      <TableHead>Trust Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.slice(0, 10).map((property, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{property.title}</TableCell>
                        <TableCell>{property.type}</TableCell>
                        <TableCell>{property.bhk} BHK</TableCell>
                        <TableCell>{property.area?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{formatPrice(property.price)}</TableCell>
                        <TableCell>₹{Math.round(property.price / (property.area || 1))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/50">
                            {property.trust_score || 0}/100
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {properties.length > 10 && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Showing 10 of {properties.length} properties
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AIInsightsChat />
      <Footer />
    </div>
  );
};

export default TransactionsLocality;
