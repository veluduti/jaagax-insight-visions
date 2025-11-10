import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { X, Loader2, ArrowRight, Shield, MapPin, Home, TrendingUp } from "lucide-react";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  bhk: number;
  type: string;
  trust_score: number;
  verified: boolean;
  images?: string[];
}

interface PropertyComparisonProps {
  properties: Property[];
  onClose: () => void;
}

export default function PropertyComparison({ properties, onClose }: PropertyComparisonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCompare = async () => {
    if (properties.length < 2) {
      toast.error("Please select at least 2 properties");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('ai-compare-properties', {
        body: { 
          propertyIds: properties.map(p => p.id),
          userId: user?.id 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setAiAnalysis(data.aiAnalysis);
      toast.success("AI comparison generated!");
    } catch (error: any) {
      console.error("Comparison error:", error);
      toast.error(error.message || "Failed to generate comparison");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI Property Comparison</h2>
            <p className="text-sm text-muted-foreground">
              Comparing {properties.length} properties with AI insights
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Property Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {properties.map((property, index) => (
              <Card key={property.id} className="p-4 glass-panel">
                <Badge variant="outline" className="mb-2">Property {index + 1}</Badge>
                {property.images && property.images[0] && (
                  <img 
                    src={property.images[0]} 
                    alt={property.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{property.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{property.locality}, {property.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span className="font-semibold text-primary">
                      ₹{(property.price / 100000).toFixed(2)}L
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{property.bhk}BHK • {property.area} sq ft</span>
                  </div>
                  {property.trust_score && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Trust Score: {property.trust_score}/100</span>
                    </div>
                  )}
                  {property.verified && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Compare Button */}
          {!aiAnalysis && (
            <Button 
              onClick={handleCompare}
              disabled={isLoading || properties.length < 2}
              className="w-full mb-6"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Properties...
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Generate AI Comparison
                </>
              )}
            </Button>
          )}

          {/* AI Analysis */}
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-6 glass-panel">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">AI Analysis</h3>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {aiAnalysis}
                  </pre>
                </div>
              </Card>

              <div className="flex gap-3">
                <Button 
                  onClick={handleCompare}
                  variant="outline"
                  disabled={isLoading}
                >
                  Regenerate Analysis
                </Button>
                <Button 
                  onClick={onClose}
                  className="flex-1"
                >
                  Done
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
