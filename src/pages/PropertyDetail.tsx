import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, Heart, Phone, MessageCircle, MapPin, 
  Bed, Bath, Square, Calendar, Download, ArrowLeft,
  CheckCircle2, TrendingUp, Building2
} from "lucide-react";
import { toast } from "sonner";
import PropertyImageCarousel from "@/components/property/PropertyImageCarousel";
import PropertyOverview from "@/components/property/PropertyOverview";
import AIInsightsPanel from "@/components/property/AIInsightsPanel";
import AgentCard from "@/components/property/AgentCard";
import PropertyMap from "@/components/property/PropertyMap";
import SimilarProperties from "@/components/property/SimilarProperties";
import BookingModal from "@/components/property/BookingModal";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  lat: number;
  lng: number;
  price: number;
  area: number;
  type: string;
  beds: number;
  baths: number;
  bhk: number;
  status: string;
  verified: boolean;
  trust_score: number;
  images: string[];
  description: string;
  agent_id: number | null;
  project_id: number | null;
}

interface Agent {
  id: number;
  agency_name: string;
  languages: string;
  cities_served: string;
  sales_count: number;
  rent_count: number;
  name: string;
  photo_url: string;
  trust_score: number;
  verified: boolean;
}

const PropertyDetail = () => {
      const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [aiValuation, setAiValuation] = useState<any>(null);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const propertyId = parseInt(id || "0");
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (propertyError) throw propertyError;
      
      // Use type assertion to handle the DB schema
      const dbProperty = propertyData as any;
      
      const mappedProperty: Property = {
        id: dbProperty.id,
        title: dbProperty.title,
        city: dbProperty.city,
        locality: dbProperty.locality,
        lat: dbProperty.lat,
        lng: dbProperty.lng,
        price: dbProperty.price,
        area: dbProperty.area,
        type: dbProperty.type,
        beds: dbProperty.beds || dbProperty.bhk || 0,
        baths: dbProperty.baths || 0,
        bhk: dbProperty.bhk,
        status: dbProperty.status || "Ready",
        verified: dbProperty.verified,
        trust_score: dbProperty.trust_score,
        images: dbProperty.images || [],
        description: dbProperty.description || "",
        agent_id: dbProperty.agent_id,
        project_id: dbProperty.project_id,
      };
      
      setProperty(mappedProperty);

      // Fetch agent if available
      if (mappedProperty.agent_id) {
        const { data: agentData } = await supabase
          .from("agents")
          .select("*")
          .eq("id", mappedProperty.agent_id)
          .single();

        if (agentData) {
          setAgent(agentData);
        }
      }

      // Fetch AI valuation
      fetchAIValuation(mappedProperty);
    } catch (error) {
      console.error("Error fetching property:", error);
      toast.error("Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIValuation = async (propertyData: Property) => {
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", {
        body: {
          price: propertyData.price,
          area: propertyData.area,
          location: `${propertyData.locality}, ${propertyData.city}`,
          type: propertyData.type,
          beds: propertyData.beds,
          baths: propertyData.baths,
        },
      });

      if (error) throw error;
      setAiValuation(data);
    } catch (error) {
      console.error("Error fetching AI valuation:", error);
    }
  };

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please login to save properties");
      return;
    }

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", id);
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, property_id: id });
      setIsFavorite(true);
      toast.success("Added to favorites");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: property?.title,
        text: `Check out this property on JaagaX`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Property not found</h2>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Image Carousel */}
      <PropertyImageCarousel 
        images={property.images} 
        verified={property.verified}
        trustScore={property.trust_score}
      />

      {/* Action Buttons */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4 flex justify-between items-center"
        >
          <div className="flex gap-2">
            <Button onClick={handleShare} variant="outline" size="lg" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              onClick={toggleFavorite} 
              variant={isFavorite ? "default" : "outline"} 
              size="lg" 
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              Save
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="lg" className="gap-2" onClick={() => setShowBookingModal(true)}>
              <Calendar className="h-4 w-4" />
              Book Visit
            </Button>
            {agent && (
              <Button variant="outline" size="lg" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <PropertyOverview property={property} />

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <p className="text-muted-foreground leading-relaxed">
                {property.description || "A premium property in a prime location with modern amenities and excellent connectivity."}
              </p>
            </motion.div>

            {/* Map */}
            <PropertyMap lat={property.lat} lng={property.lng} verified={property.verified} />

            {/* Similar Properties */}
            <SimilarProperties 
              city={property.city} 
              type={property.type} 
              currentPropertyId={property.id} 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AIInsightsPanel 
              property={property} 
              valuation={aiValuation}
            />
            
            {agent && <AgentCard agent={agent} propertyId={property.id} />}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t p-4 z-50">
        <div className="flex gap-2">
          {agent && (
            <>
              <Button variant="outline" size="lg" className="flex-1 gap-2">
                <Phone className="h-4 w-4" />
                Call
              </Button>
              <Button variant="outline" size="lg" className="flex-1 gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
            </>
          )}
          <Button size="lg" className="flex-1 gap-2" onClick={() => setShowBookingModal(true)}>
            <Calendar className="h-4 w-4" />
            Book
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
