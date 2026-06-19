import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
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
import LoanAssistanceDialog from "@/components/financial/LoanAssistanceDialog";
import { useState as useLoanState } from "react";
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
import AuthGate from "@/components/property/AuthGate";
import PropertyVideoReels from "@/components/property/PropertyVideoReels";
import { useAuth } from "@/hooks/useAuth";
import { trackPropertyEvent } from "@/lib/propertyEvents";
import SEO from "@/components/SEO";

interface Property {
  id: string;
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
  video_urls: string[];
  description: string;
  agent_id: string | null;
  project_id: string | null;
  building_name: string | null;
  total_floors: number | null;
  total_parking: number | null;
  building_area_sqft: number | null;
  elevators: number | null;
  retail_centres: number | null;
  amenities: string[];
  is_live: boolean;
  verification_status: string | null;
  expiry_date: string | null;
}

interface Agent {
  id: string;
  agency_name: string | null;
  languages: string[] | null;
  cities_served: string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  name: string | null;
  photo_url: string | null;
  trust_score: number | null;
  verified: boolean | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const id = slug; // backward-compat for code below that still references `id`
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  // Validate slug parameter
  useEffect(() => {
    if (!slug) {
      toast.error("Invalid property URL");
      navigate("/projects");
    }
  }, [slug, navigate]);
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPreCallModal, setShowPreCallModal] = useState(false);
  const [aiValuation, setAiValuation] = useState<any>(null);

  useEffect(() => {
    fetchProperty();
  }, [slug]);

  const fetchProperty = async () => {
    try {
      // Lookup by slug first; fall back to id for legacy UUID links
      let { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();

      if (!propertyData && slug && UUID_RE.test(slug)) {
        const res = await supabase
          .from("properties")
          .select("*")
          .eq("id", slug)
          .maybeSingle();
        propertyData = res.data;
        propertyError = res.error;
        if (propertyData && (propertyData as any).slug) {
          navigate(`/property/${(propertyData as any).slug}`, { replace: true });
          return;
        }
      }

      if (propertyError) throw propertyError;
      
      if (!propertyData) {
        setProperty(null);
        setLoading(false);
        return;
      }
      
      // Build a public-facing view that reads from final_data first.
      // Rule: Frontend uses ONLY final_data — never agent_data / seller_data.
      const view = getPublicPropertyView(propertyData);
      if (!view) {
        setProperty(null);
        setLoading(false);
        return;
      }

      // Validate critical fields (against the public view)
      if (!view.title || !view.city || !view.locality || !view.price) {
        setProperty(null);
        setLoading(false);
        return;
      }

      // Use type assertion to handle the DB schema (raw row kept for fields
      // not yet surfaced through final_data, e.g. building metadata).
      const dbProperty = propertyData as any;

      // Parse images from the public view — handle both array and newline-string forms
      const rawImages = view.images;
      let parsedImages: string[] = [];
      if (rawImages) {
        if (Array.isArray(rawImages)) {
          parsedImages = rawImages.flatMap((img: string) =>
            typeof img === 'string' && img.includes('\n')
              ? img.split('\n').map((url: string) => url.trim()).filter(Boolean)
              : img
          );
        } else if (typeof rawImages === 'string') {
          parsedImages = (rawImages as string).split('\n').map((url: string) => url.trim()).filter(Boolean);
        }
      }

      const mappedProperty: Property = {
        id: view.id,
        title: view.title,
        city: view.city!,
        locality: view.locality!,
        lat: view.latitude ?? null,
        lng: view.longitude ?? null,
        price: view.price!,
        area: view.area_sqft ?? null,
        type: view.type ?? "Apartment",
        beds: view.bedrooms || view.bhk || 0,
        baths: view.bathrooms || 0,
        bhk: view.bhk ?? null,
        status: dbProperty.completion_stage || "Ready",
        verified: view.verified,
        trust_score: view.trust_score ?? null,
        images: parsedImages,
        video_urls: Array.isArray(view.video_urls) ? view.video_urls : [],
        description: view.description || "",
        agent_id: dbProperty.assigned_agent_id || null,
        project_id: null,
        building_name: dbProperty.building_name ?? null,
        total_floors: dbProperty.total_floors ?? null,
        total_parking: dbProperty.total_parking ?? null,
        building_area_sqft: dbProperty.building_area_sqft ?? null,
        elevators: dbProperty.elevators ?? null,
        retail_centres: dbProperty.retail_centres ?? null,
        amenities: Array.isArray(view.amenities)
          ? view.amenities.filter((a: any) => typeof a === "string" && a.trim().length > 0)
          : [],
        is_live: view.is_live === true,
        verification_status: dbProperty.verification_status ?? null,
        expiry_date: view.expiry_date ?? null,
      };

      setProperty(mappedProperty);

      // Track property view event
      trackPropertyEvent({ propertyId: mappedProperty.id, eventType: "view" });

      // Load the assigned agent (the only agent who can handle this property)
      if (dbProperty.assigned_agent_id) {
        const { data: agentData } = await supabase
          .from("agents")
          .select("*")
          .eq("id", dbProperty.assigned_agent_id)
          .maybeSingle();
        if (agentData) setAgent(agentData as any);
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
      if (id) trackPropertyEvent({ propertyId: id, eventType: "save" });
    }
  };

  const handleShare = async () => {
    if (id) trackPropertyEvent({ propertyId: id, eventType: "share" });
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

  const fireLead = async (source: "call" | "whatsapp" | "inquiry") => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.functions.invoke("create-property-lead", {
        body: {
          property_id: id,
          source,
          lead_name: user?.user_metadata?.full_name ?? null,
          lead_email: user?.email ?? null,
          lead_phone: user?.user_metadata?.phone ?? null,
        },
      });
    } catch (e) {
      // Non-blocking — UI flow continues even if lead capture fails
      console.warn("Lead capture failed", e);
    }
  };

  const handleCall = () => {
    if (id) trackPropertyEvent({ propertyId: id, eventType: "call_click" });
    fireLead("call");
    setShowPreCallModal(true);
  };

  const handleWhatsApp = () => {
    if (id) trackPropertyEvent({ propertyId: id, eventType: "whatsapp_click" });
    fireLead("whatsapp");
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

  // Hide expired listings from the public.
  const isExpired = property.verification_status === "expired";
  const isNotLive = !property.is_live;
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="glass-panel rounded-2xl p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Building2 className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                Listing Expired
              </h2>
              <p className="text-muted-foreground">
                This listing has expired and is no longer accepting enquiries. The owner can renew it from their dashboard.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => navigate("/search")} className="flex-1 gap-2">
                <MapPin className="h-4 w-4" />
                Browse Live Listings
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
      <SEO
        title={`${property.title} in ${property.locality}, ${property.city}`}
        description={(property.description || `${property.bhk ? property.bhk + ' BHK ' : ''}${property.type || 'Property'} in ${property.locality}, ${property.city}. ${property.area ? property.area + ' sqft. ' : ''}Verified by JAAGA X.`).slice(0, 160)}
        canonicalPath={`/property/${slug}`}
        image={property.images?.[0]}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: property.title,
          description: property.description,
          image: property.images?.slice(0, 5),
          offers: {
            "@type": "Offer",
            price: property.price,
            priceCurrency: "INR",
            availability: property.is_live ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
          brand: { "@type": "Brand", name: "JAAGA X" },
        }}
      />
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
          <span>Property Ref: <span className="font-semibold text-foreground">JX{property.id.slice(0, 8)}</span></span>
        </div>
      </div>

      {/* Media Hub - Enhanced with video, 360 tour, floorplans */}
      <MediaHub
        images={property.images}
        videos={property.video_urls}
        virtualTourUrl={property.video_urls?.find(url => url.includes('virtual-tour') || url.includes('360'))}
        floorplans={[]}
        brochureUrl={undefined}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* Property Video Reels from YouTube/Instagram */}
      {property.video_urls.length > 0 && (
        <div className="container mx-auto px-4 mt-6">
          <PropertyVideoReels videoUrls={property.video_urls} propertyTitle={property.title} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          {isNotLive && (
            <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 md:mb-0 md:mr-4">
              This listing is visible as approved inventory, but live enquiries are currently limited.
            </div>
          )}
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
              className="gap-2 hidden md:inline-flex"
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              Save
            </Button>
            <Button size="lg" className="gap-2" onClick={() => { fireLead("inquiry"); setShowBookingModal(true); }}>
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
        <AuthGate isAuthenticated={isAuthenticated} label="Sign in to see AI analysis">
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
        </AuthGate>

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
              <PropertyTabs 
                description={property.description || "A premium property in a prime location with modern amenities and excellent connectivity."} 
                price={property.price}
                area={property.area}
                locality={property.locality}
                city={property.city}
              />
            </motion.div>

            {/* Property Information */}
            <PropertyInformation property={property} />

            {/* Building Information */}
            <BuildingInformation
              locality={property.locality}
              verified={property.verified}
              buildingName={property.building_name}
              totalFloors={property.total_floors}
              totalParking={property.total_parking}
              buildingArea={property.building_area_sqft}
              elevators={property.elevators}
              retailCentres={property.retail_centres}
            />

            {/* Amenities — only renders when at least one real amenity exists */}
            <PropertyAmenities amenities={property.amenities} />

            {/* Map — only renders when real coordinates exist */}
            <PropertyMap lat={property.lat} lng={property.lng} verified={property.verified} />

            {/* Nearby POI */}
            <NearbyPOI city={property.city} lat={property.lat} lng={property.lng} locality={property.locality} />

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
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to chat with AI advisor">
              <AIPropertyAdvisor 
                property={property}
                propertyId={property.id}
              />
            </AuthGate>

            {/* Micro-Comparables & TAP */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to view comparables">
              <MicroComparables
                property={property}
                propertyId={property.id}
              />
            </AuthGate>

            {/* Loan Assistance */}
            <LoanAssistanceButtonWrapper property={property} />

            {/* EMI Calculator */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to use EMI calculator">
              <EMICalculator propertyPrice={property.price} />
            </AuthGate>

            {/* Payment Plans */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to view payment plans">
              <PaymentPlans propertyPrice={property.price} status={property.status} />
            </AuthGate>
            
            {/* Agents Listing — strict: only the assigned agent handles this property */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to contact your agent">
              <NearbyAgents
                primaryAgent={agent}
                city={property.city}
                locality={property.locality}
                propertyId={property.id}
                exclusiveAssignedAgent={!!agent}
              />
            </AuthGate>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        propertyId={property.id}
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
          <Button size="lg" className="flex-1 gap-2" onClick={() => { fireLead("inquiry"); setShowBookingModal(true); }}>
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

function LoanAssistanceButtonWrapper({ property }: { property: any }) {
  const [open, setOpen] = useLoanState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold shadow-lg hover:opacity-90 transition"
      >
        💰 Get Loan Assistance
      </button>
      <LoanAssistanceDialog
        open={open}
        onOpenChange={setOpen}
        propertyId={property?.id}
        propertyTitle={property?.title}
        propertyValue={property?.price}
      />
    </>
  );
}

export default PropertyDetail;