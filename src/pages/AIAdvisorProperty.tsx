import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  ArrowLeft, Sparkles, MapPin, Home, TrendingUp, 
  Shield, Loader2, MessageSquare, Phone, Heart,
  Bed, Bath, Maximize, Star, CheckCircle
} from "lucide-react";

export default function AIAdvisorProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [similarProperties, setSimilarProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch property details
      const { data: propertyData, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId || '')
        .maybeSingle();

      if (error) throw error;
      if (!propertyData) {
        toast.error("Property not found");
        navigate('/ai-advisor');
        return;
      }

      setProperty(propertyData);

      // Generate AI insights
      generateAIInsights(propertyData);

      // Fetch similar properties
      fetchSimilarProperties(propertyData);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      toast.error("Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async (propertyData: any) => {
    setLoadingAI(true);
    try {
      const query = `Why is this property a good choice? Property: ${propertyData.title}, ${propertyData.locality}, ${propertyData.city}, ₹${(propertyData.price / 100000).toFixed(2)}L, ${propertyData.bhk}BHK, Trust Score: ${propertyData.trust_score}`;
      
      const { data, error } = await supabase.functions.invoke('ai-property-advisor', {
        body: { query, userId: null }
      });

      if (error) throw error;

      if (data.success && data.aiSummary) {
        setAiInsight(data.aiSummary);
      }
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      setAiInsight("This property offers excellent value in a prime location with verified credentials.");
    } finally {
      setLoadingAI(false);
    }
  };

  const fetchSimilarProperties = async (propertyData: any) => {
    try {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('city', propertyData.city)
        .eq('verified', true)
        .neq('id', propertyData.id)
        .limit(3);

      if (data) {
        setSimilarProperties(data);
      }
    } catch (error) {
      console.error("Error fetching similar properties:", error);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full mb-6" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden glass-panel">
                <div className="relative h-[400px]">
                  <img
                    src={property.images?.[0] || ""}
                    alt={property.title}
                    className="w-full h-full object-cover"
                   loading="lazy" decoding="async" />
                  {property.verified && (
                    <Badge className="absolute top-4 right-4 bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verified Property
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4" />
                    {property.locality}, {property.city}
                  </p>
                  <div className="flex items-center gap-6 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(property.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trust Score</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Star className="h-6 w-6 text-yellow-500" />
                        {property.trust_score || 'N/A'}/100
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Bed className="h-5 w-5" />
                      {property.bhk} BHK
                    </span>
                    <span className="flex items-center gap-2">
                      <Bath className="h-5 w-5" />
                      {property.baths} Bathrooms
                    </span>
                    <span className="flex items-center gap-2">
                      <Maximize className="h-5 w-5" />
                      {property.area} sq.ft
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Property Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAI ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing property...
                    </div>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{aiInsight}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Property Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {property.description || "A premium property in an excellent location with modern amenities and facilities."}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="secondary">{property.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle>Similar Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {similarProperties.map((prop) => (
                        <Card
                          key={prop.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => navigate(`/ai-advisor/${prop.id}`)}
                        >
                          <img
                            src={prop.images?.[0] || ""}
                            alt={prop.title}
                            className="w-full h-32 object-cover rounded-t-lg"
                           loading="lazy" decoding="async" />
                          <CardContent className="p-3">
                            <h4 className="font-semibold text-sm truncate">{prop.title}</h4>
                            <p className="text-primary font-bold text-sm">
                              {formatPrice(prop.price)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-panel sticky top-20">
                <CardHeader>
                  <CardTitle>Contact Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Agent
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Heart className="h-4 w-4 mr-2" />
                    Save Property
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}