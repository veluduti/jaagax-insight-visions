import { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, TrendingUp, Home, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PropertyValuation = () => {
  const [formData, setFormData] = useState({
    city: "",
    locality: "",
    propertyType: "",
    bedrooms: "",
    area: "",
    amenities: [] as string[],
  });
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Fetch similar properties from Supabase
      let query = supabase
        .from("properties")
        .select("*")
        .eq("city", formData.city);

      if (formData.locality) {
        query = query.eq("locality", formData.locality);
      }
      if (formData.propertyType) {
        query = query.eq("type", formData.propertyType.toLowerCase() as any);
      }
      if (formData.bedrooms) {
        query = query.eq("beds", parseInt(formData.bedrooms));
      }

      const { data: similarProperties, error } = await query.limit(10);

      if (error) throw error;

      if (similarProperties && similarProperties.length > 0) {
        // Calculate average price per sqft
        const avgPricePerSqft =
          similarProperties.reduce((sum, prop) => {
            return sum + (prop.price || 0) / (prop.area || 1);
          }, 0) / similarProperties.length;

        const estimatedPrice = avgPricePerSqft * parseInt(formData.area);
        const minPrice = estimatedPrice * 0.9;
        const maxPrice = estimatedPrice * 1.1;

        setValuation({
          estimatedPrice: Math.round(estimatedPrice),
          minPrice: Math.round(minPrice),
          maxPrice: Math.round(maxPrice),
          pricePerSqft: Math.round(avgPricePerSqft),
          comparableProperties: similarProperties.length,
          marketTrend: "Rising",
          confidence: "High",
        });

        toast.success("Valuation complete!");
      } else {
        toast.error("No comparable properties found in this area");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to calculate valuation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">TruValue™</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI-Powered Property Valuation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get instant, accurate property valuations for Hyderabad and Vijayawada
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Valuation Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-panel p-6">
                <h2 className="text-2xl font-bold mb-6">Property Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) =>
                        setFormData({ ...formData, city: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                        <SelectItem value="Vijayawada">Vijayawada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="locality">Locality</Label>
                    <Input
                      id="locality"
                      placeholder="e.g., Gachibowli, Banjara Hills"
                      value={formData.locality}
                      onChange={(e) =>
                        setFormData({ ...formData, locality: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="propertyType">Property Type *</Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, propertyType: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="Villa">Villa</SelectItem>
                        <SelectItem value="Plot">Plot</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Select
                      value={formData.bedrooms}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bedrooms: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Bedrooms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 BHK</SelectItem>
                        <SelectItem value="2">2 BHK</SelectItem>
                        <SelectItem value="3">3 BHK</SelectItem>
                        <SelectItem value="4">4 BHK</SelectItem>
                        <SelectItem value="5">5+ BHK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="area">Area (Sq.ft) *</Label>
                    <Input
                      id="area"
                      type="number"
                      placeholder="e.g., 1500"
                      value={formData.area}
                      onChange={(e) =>
                        setFormData({ ...formData, area: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Calculating..." : "Get Valuation"}
                  </Button>
                </form>
              </Card>
            </motion.div>

            {/* Valuation Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {valuation ? (
                <Card className="glass-panel p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Estimated Value</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                      <p className="text-sm text-muted-foreground mb-2">
                        Estimated Price
                      </p>
                      <p className="text-4xl font-bold text-primary">
                        ₹{(valuation.estimatedPrice / 10000000).toFixed(2)} Cr
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Range: ₹{(valuation.minPrice / 10000000).toFixed(2)} Cr - ₹
                        {(valuation.maxPrice / 10000000).toFixed(2)} Cr
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-background/50">
                        <p className="text-sm text-muted-foreground mb-1">
                          Price per Sq.ft
                        </p>
                        <p className="text-2xl font-bold">
                          ₹{valuation.pricePerSqft.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-background/50">
                        <p className="text-sm text-muted-foreground mb-1">
                          Market Trend
                        </p>
                        <p className="text-2xl font-bold text-green-500">
                          {valuation.marketTrend}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-background/50">
                        <p className="text-sm text-muted-foreground mb-1">
                          Comparable Properties
                        </p>
                        <p className="text-2xl font-bold">
                          {valuation.comparableProperties}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-background/50">
                        <p className="text-sm text-muted-foreground mb-1">
                          Confidence
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {valuation.confidence}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <p className="font-semibold mb-1">Next Steps</p>
                          <p className="text-sm text-muted-foreground">
                            Connect with our verified agents to list your property
                            at the optimal price or find similar properties in your
                            budget.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => (window.location.href = "/agents")}
                      >
                        Find Agent
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => (window.location.href = "/map")}
                      >
                        View on Map
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="glass-panel p-6 flex flex-col items-center justify-center h-full text-center">
                  <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Fill in the details
                  </h3>
                  <p className="text-muted-foreground">
                    Provide your property details to get an instant AI-powered
                    valuation
                  </p>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PropertyValuation;
