import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, Heart, Phone, MessageCircle, MapPin, 
  Bed, Bath, Square, Calendar, Download, ArrowLeft,
  CheckCircle2, TrendingUp, Building2, Hash, Brain
} from "lucide-react";
import { toast } from "sonner";
import PropertyImageCarousel from "@/components/property/PropertyImageCarousel";
import PropertyOverview from "@/components/property/PropertyOverview";
import AIInsightsPanel from "@/components/property/AIInsightsPanel";
import AgentCard from "@/components/property/AgentCard";
import PropertyMap from "@/components/property/PropertyMap";
import SimilarProperties from "@/components/property/SimilarProperties";
import BookingModal from "@/components/property/BookingModal";
import PropertyBreadcrumb from "@/components/property/PropertyBreadcrumb";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyInformation from "@/components/property/PropertyInformation";
import BuildingInformation from "@/components/property/BuildingInformation";
import PropertyTabs from "@/components/property/PropertyTabs";
import EMICalculator from "@/components/property/EMICalculator";
import NearbyPOI from "@/components/property/NearbyPOI";
import PropertyActions from "@/components/property/PropertyActions";
import PaymentPlans from "@/components/property/PaymentPlans";
import PropertyStats from "@/components/property/PropertyStats";
import MediaHub from "@/components/property/MediaHub";
import AIPropertyAdvisor from "@/components/property/AIPropertyAdvisor";
import NearbyAgents from "@/components/property/NearbyAgents";
import MicroComparables from "@/components/property/MicroComparables";
import AIDecisionPanel from "@/components/property/AIDecisionPanel";
import AIPreCallContext from "@/components/property/AIPreCallContext";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  lat: number | null;
  lng: number | null;
  price: number;
  area: number | null;
  type: string | null;
  beds: number;
  baths: number;
  bhk: number | null;
  status: string;
  verified: boolean;
  trust_score: number | null;
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
  
  // Validate ID parameter
  useEffect(() => {
    if (!id || isNaN(parseInt(id))) {
      toast.error("Invalid property ID");
      navigate("/projects");
    }
  }, [id, navigate]);
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPreCallModal, setShowPreCallModal] = useState(false);
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
        .eq("verified", true)
        .maybeSingle();

      if (propertyError) throw propertyError;
      
      if (!propertyData) {
        setProperty(null);
        setLoading(false);
        return;
      }
      
      // Validate critical fields
      if (!propertyData.title || !propertyData.city || !propertyData.locality || !propertyData.price) {
        setProperty(null);
        setLoading(false);
        return;
      }
      
      // Use type assertion to handle the DB schema
      const dbProperty = propertyData as any;
      
      // Parse images - handle both array format and newline-separated string format
      let parsedImages: string[] = [];
      if (dbProperty.images) {
        if (Array.isArray(dbProperty.images)) {
          // If it's already an array, flatten in case items contain newlines
          parsedImages = dbProperty.images.flatMap((img: string) => 
            typeof img === 'string' && img.includes('\n') 
              ? img.split('\n').map((url: string) => url.trim()).filter(Boolean)
              : img
          );
        } else if (typeof dbProperty.images === 'string') {
          // If it's a single string with newlines
          parsedImages = dbProperty.images.split('\n').map((url: string) => url.trim()).filter(Boolean);
        }
      }
      
      const mappedProperty: Property = {
        id: dbProperty.id,
        title: dbProperty.title,
        city: dbProperty.city,
        locality: dbProperty.locality,
        lat: dbProperty.lat ?? null,
        lng: dbProperty.lng ?? null,
        price: dbProperty.price,
        area: dbProperty.area ?? null,
        type: dbProperty.type ?? "Apartment",
        beds: dbProperty.beds || dbProperty.bhk || 0,
        baths: dbProperty.baths || 0,
        bhk: dbProperty.bhk ?? null,
        status: dbProperty.status || "Ready",
        verified: dbProperty.verified,
        trust_score: dbProperty.trust_score ?? null,
        images: parsedImages,
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
          .maybeSingle();

        if (agentData) {
          setAgent(agentData);
        }
      }

      // Fetch AI valuation
      fetchAIValuation(mappedProperty);
    } catch (error) {
      toast.error("Property not found");
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

      if (error) {
        console.error("AI valuation error:", error);
        return;
      }
      setAiValuation(data);
    } catch (error: any) {
      console.error("AI valuation failed:", error);
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

  const handleCall = () => {
    // Redirect to AI Pre-Call flow instead of direct call
    setShowPreCallModal(true);
  };

  const handleWhatsApp = () => {
    // Redirect to AI Pre-Call flow instead of direct WhatsApp
    setShowPreCallModal(true);
  };

  const handleContextSaved = (contextId: string) => {
    // Navigate to slot selection with the context
    navigate(`/visit/schedule?contextId=${contextId}&propertyId=${property?.id}`);
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="glass-panel rounded-2xl p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Property Not Found</h2>
              <p className="text-muted-foreground">
                The property you're looking for doesn't exist or has been removed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => navigate("/map")} className="flex-1 gap-2">
                <MapPin className="h-4 w-4" />
                Browse Properties
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                Go Home
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button & Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <PropertyBreadcrumb
          city={property.city}
          locality={property.locality}
          title={property.title}
        />
        
        {/* Property Reference */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>Property Ref: <span className="font-semibold text-foreground">JX{property.id}</span></span>
        </div>
      </div>

      {/* Media Hub - Enhanced with video, 360 tour, floorplans */}
      <MediaHub
        images={property.images}
        videos={[]}
        virtualTourUrl={undefined}
        floorplans={[]}
        brochureUrl={undefined}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* Action Buttons */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <PropertyActions 
            propertyId={property.id}
            propertyTitle={property.title}
            propertyType="property"
          />
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={toggleFavorite} 
              variant={isFavorite ? "default" : "outline"} 
              size="lg" 
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              Save
            </Button>
            <Button size="lg" className="gap-2" onClick={() => setShowBookingModal(true)}>
              <Calendar className="h-4 w-4" />
              Book Visit
            </Button>
            <Button 
              size="lg" 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setShowPreCallModal(true)}
            >
              <Brain className="h-4 w-4" />
              Talk to AI Expert
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* AI Decision Panel - Above Price Section */}
        <AIDecisionPanel 
          propertyId={property.id}
          propertyData={{
            title: property.title,
            price: property.price,
            locality: property.locality,
            city: property.city,
            type: property.type,
            beds: property.beds,
            area: property.area,
            trust_score: property.trust_score
          }}
        />

        {/* Property Stats */}
        <PropertyStats entityId={property.id} entityType="property" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <PropertyOverview property={property} />

            {/* Property Tabs - Overview, Trends, Mortgage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-panel rounded-xl p-6"
            >
              <PropertyTabs description={property.description || "A premium property in a prime location with modern amenities and excellent connectivity."} />
            </motion.div>

            {/* Property Information */}
            <PropertyInformation property={property} />

            {/* Building Information */}
            <BuildingInformation locality={property.locality} verified={property.verified} />

            {/* Amenities */}
            <PropertyAmenities type={property.type} verified={property.verified} />

            {/* Map */}
            <PropertyMap lat={property.lat} lng={property.lng} verified={property.verified} />

            {/* Nearby POI */}
            <NearbyPOI city={property.city} lat={property.lat} lng={property.lng} />

            {/* Similar Properties */}
            <SimilarProperties 
              city={property.city} 
              type={property.type} 
              currentPropertyId={property.id} 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Property Advisor with Chat */}
            <AIPropertyAdvisor 
              property={property}
              propertyId={property.id}
            />

            {/* Micro-Comparables & TAP */}
            <MicroComparables
              property={property}
              propertyId={property.id}
            />

            {/* EMI Calculator */}
            <EMICalculator propertyPrice={property.price} />

            {/* Payment Plans */}
            <PaymentPlans propertyPrice={property.price} status={property.status} />
            
            {/* Agents Listing - Primary + Nearby */}
            <NearbyAgents
              primaryAgent={agent}
              city={property.city}
              locality={property.locality}
              propertyId={property.id}
            />
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        propertyId={property.id.toString()}
        propertyTitle={property.title}
        propertyCity={property.city}
        propertyLocality={property.locality}
      />

      {/* AI Pre-Call Context Modal */}
      <AIPreCallContext
        open={showPreCallModal}
        onClose={() => setShowPreCallModal(false)}
        propertyId={property.id}
        propertyTitle={property.title}
        onContextSaved={handleContextSaved}
      />

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t p-4 z-50">
        <div className="flex gap-2">
          <Button size="lg" className="flex-1 gap-2" onClick={() => setShowBookingModal(true)}>
            <Calendar className="h-4 w-4" />
            Book
          </Button>
          <Button 
            size="lg" 
            className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setShowPreCallModal(true)}
          >
            <Brain className="h-4 w-4" />
            AI Expert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
