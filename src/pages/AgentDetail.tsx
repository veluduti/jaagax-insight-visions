import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Star,
  MessageSquare,
  Phone,
  Building2,
  Shield,
  ChevronLeft,
  Home,
  Loader2,
  CheckCircle2,
  Languages,
  Award,
  TrendingUp,
  Users,
  Mail,
  Share2,
  ArrowRightLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import AgentBadges from "@/components/agents/AgentBadges";
import AgentExpertise from "@/components/agents/AgentExpertise";
import AgentPropertyFilters, { PropertyFilters } from "@/components/agents/AgentPropertyFilters";
import AgentPerformance from "@/components/agents/AgentPerformance";
import AgentVideoSection from "@/components/agents/AgentVideoSection";
import AgentSuccessStories from "@/components/agents/AgentSuccessStories";
import AgentTeamMembers from "@/components/agents/AgentTeamMembers";
import AgentAvailabilityCalendar from "@/components/agents/AgentAvailabilityCalendar";

interface Agent {
  id: string;
  name: string | null;
  photo_url: string | null;
  agency_name: string | null;
  cities_served: string | string[] | null;
  languages: string | string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  trust_score: number | null;
  verified: boolean | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  active: boolean | null;
}

interface Review {
  id: string;
  rating: number;
  feedback: string;
  created_at: string;
  reviewer_id: string;
  property_type: string | null;
  transaction_type: string | null;
}

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState("properties");

  useEffect(() => {
    if (id) {
      fetchAgentDetails();
    }
  }, [id]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const agentId = id || "";

      // Fetch agent profile from agents table
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .maybeSingle();

      if (agentError) throw agentError;
      
      if (!agentData) {
        toast.error("Agent not found");
        setLoading(false);
        return;
      }

      setAgent(agentData as Agent);

      // Fetch agent's properties (using builder_id as agent reference)
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("*")
        .eq("builder_id", agentId)
        .order("created_at", { ascending: false })
        .limit(12);

      setProperties((propertiesData || []) as Property[]);
      setFilteredProperties((propertiesData || []) as Property[]);

      // Fetch real agent ratings from agent_ratings table
      const { data: ratingsData } = await supabase
        .from("agent_ratings" as any)
        .select("id, rating, review, created_at, buyer_id, property_id")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50);

      const realReviews: Review[] = ((ratingsData as any) || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        feedback: r.review || "",
        created_at: r.created_at,
        reviewer_id: r.buyer_id,
        property_type: null,
        transaction_type: null,
      }));
      setReviews(realReviews);
    } catch (error) {
      toast.error("Failed to load agent profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    window.location.href = `tel:+919876543210`;
    toast.success("Opening dialer...");
  };

  const handleWhatsApp = () => {
    if (agent) {
      const message = encodeURIComponent(
        `Hi ${agent.name}, I found your profile on JaagaX and I'm interested in discussing properties.`
      );
      window.open(`https://wa.me/919876543210?text=${message}`, "_blank");
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:contact@jaagax.com?subject=Inquiry for ${agent?.name}`;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: agent?.name,
        text: `Check out ${agent?.name} on JaagaX`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleFilterChange = (filters: PropertyFilters) => {
    let filtered = [...properties];

    // Filter by purpose (sale/rent)
    if (filters.purpose !== "all") {
      // This would require a status field on properties to distinguish sale vs rent
      // For now, we'll skip this filter as the schema doesn't have it
    }

    // Filter by type
    if (filters.type !== "all") {
      filtered = filtered.filter(p => p.type.toLowerCase() === filters.type.toLowerCase());
    }

    // Filter by BHK
    if (filters.bhk !== "all") {
      const bhkValue = parseInt(filters.bhk);
      filtered = filtered.filter(p => {
        if (bhkValue === 4) {
          return p.bhk >= 4;
        }
        return p.bhk === bhkValue;
      });
    }

    // Filter by location
    if (filters.location.trim()) {
      const searchTerm = filters.location.toLowerCase();
      filtered = filtered.filter(p => 
        p.locality.toLowerCase().includes(searchTerm) ||
        p.city.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by price range
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filtered = filtered.filter(p => p.price >= minPrice);
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filtered = filtered.filter(p => p.price <= maxPrice);
    }

    setFilteredProperties(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-6 py-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-6 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Agent not found</h2>
          <Button onClick={() => navigate("/agents")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  const avgRating = calculateAverageRating();
  const totalDeals = agent.sales_count + agent.rent_count;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/agents")} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>

        {/* Agent Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-8 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Avatar and Basic Info */}
            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="relative">
                <Avatar className="w-40 h-40 border-4 border-primary/20">
                  <AvatarImage src={agent.photo_url} alt={agent.name} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {agent.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {agent.verified && (
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Trust Score */}
              <div className="text-center lg:text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Trust Score</span>
                </div>
                <div className="text-3xl font-bold text-primary">{agent.trust_score}/100</div>
              </div>
            </div>

            {/* Right: Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
                  {agent.verified && (
                    <Badge className="mb-3 bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified Agent
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 text-lg text-muted-foreground mb-4">
                    <Building2 className="h-5 w-5" />
                    <span>{agent.agency_name}</span>
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                  <span className="text-2xl font-bold">{avgRating}</span>
                </div>
                <span className="text-muted-foreground">
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Sales</span>
                  </div>
                  <p className="text-2xl font-bold">{agent.sales_count}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Rentals</span>
                  </div>
                  <p className="text-2xl font-bold">{agent.rent_count}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Deals</span>
                  </div>
                  <p className="text-2xl font-bold">{totalDeals}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Listings</span>
                  </div>
                  <p className="text-2xl font-bold">{properties.length}</p>
                </div>
              </div>

              {/* Professional Badges */}
              <AgentBadges 
                verified={agent.verified}
                trustScore={agent.trust_score}
                salesCount={agent.sales_count}
                rentCount={agent.rent_count}
              />

              <Separator className="my-6" />

              {/* Info Badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Badge variant="outline" className="py-2 px-4">
                  <MapPin className="h-4 w-4 mr-2" />
                 {Array.isArray(agent.cities_served) ? agent.cities_served.join(", ") : (agent.cities_served || "N/A")}
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <Languages className="h-4 w-4 mr-2" />
                 {Array.isArray(agent.languages) ? agent.languages.join(", ") : (agent.languages || "N/A")}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={handleCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Agent
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  onClick={handleWhatsApp}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button size="lg" variant="outline" onClick={handleEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate(`/agents/compare?agents=${agent.id}`)}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            About {agent.name}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {agent.name} is a verified real estate agent with {agent.agency_name}, specializing in 
            properties across {Array.isArray(agent.cities_served) ? agent.cities_served.join(", ") : (agent.cities_served || "N/A")}. With {totalDeals} successful deals completed, 
            including {agent.sales_count} sales and {agent.rent_count} rentals, {agent.name} brings 
            extensive market knowledge and a proven track record of client satisfaction. 
            Fluent in {Array.isArray(agent.languages) ? agent.languages.join(", ") : (agent.languages || "N/A")}, ensuring clear communication with diverse clients. 
            Trust Score of {agent.trust_score}/100 reflects commitment to transparency and professionalism.
          </p>
        </motion.div>

        {/* Video Section */}
        <AgentVideoSection agentName={agent.name} />

        {/* Success Stories */}
        <AgentSuccessStories agentName={agent.name} />

        {/* Team Members */}
        <AgentTeamMembers agencyName={agent.agency_name || ""} currentAgentId={agent.id} />

        {/* Tabs Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="properties">
                    Properties ({properties.length})
                  </TabsTrigger>
                  <TabsTrigger value="reviews">
                    Reviews ({reviews.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="properties" className="mt-0 space-y-6">
                  {/* Property Filters */}
                  <AgentPropertyFilters onFilterChange={handleFilterChange} />

                  {filteredProperties.length === 0 ? (
                    <Card className="glass-panel">
                      <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {properties.length > 0 
                            ? "No properties match your filters" 
                            : "No properties listed yet"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredProperties.map((property) => (
                    <Card
                      key={property.id}
                      className="glass-panel overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => window.open(`/property/${(property as any).slug || property.id}`, "_blank", "noopener,noreferrer")}
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={
                            property.images?.[0] ||
                            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
                          }
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                         loading="lazy" decoding="async" />
                        {property.verified && (
                          <Badge className="absolute top-3 left-3 bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        <Badge className="absolute top-3 right-3 bg-primary">
                          {property.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold mb-2 line-clamp-1 text-lg">{property.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{property.locality}, {property.city}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-bold text-primary">
                            {formatPrice(property.price)}
                          </span>
                          <Badge variant="outline">{property.bhk} BHK</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{property.area_sqft} sq.ft</span>
                          <span className="capitalize">{property.type}</span>
                        </div>
                      </CardContent>
                    </Card>
                   ))}
                 </div>
               )}
                </TabsContent>

                <TabsContent value="reviews" className="mt-0">
              {reviews.length === 0 ? (
                <Card className="glass-panel">
                  <CardContent className="py-12 text-center">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <Card key={review.id} className="glass-panel">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-5 w-5 ${
                                      i < review.rating
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-lg">{review.rating}.0</span>
                            </div>
                            {review.property_type && (
                              <Badge variant="outline" className="mb-3">
                                {review.property_type}
                                {review.transaction_type && ` - ${review.transaction_type}`}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{review.feedback}</p>
                      </CardContent>
                    </Card>
                   ))}
                 </div>
               )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Expertise & Service Areas */}
            <AgentExpertise 
              salesCount={agent.sales_count || 0}
              rentCount={agent.rent_count || 0}
              citiesServed={Array.isArray(agent.cities_served) ? agent.cities_served.join(", ") : (agent.cities_served || "")}
            />

            {/* Performance Metrics */}
            <AgentPerformance 
              salesCount={agent.sales_count || 0}
              rentCount={agent.rent_count || 0}
              trustScore={agent.trust_score || 0}
              reviewCount={reviews.length}
              averageRating={avgRating.toString()}
            />

            {/* Availability Calendar */}
            <AgentAvailabilityCalendar agentName={agent.name || ""} agentId={agent.id} />
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 glass-panel rounded-xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-3">Ready to find your perfect property?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Contact {agent.name} today to discuss your requirements and get expert guidance 
            on properties in {Array.isArray(agent.cities_served) ? agent.cities_served.join(", ") : (agent.cities_served || "N/A")}.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={handleCall}>
              <Phone className="h-4 w-4 mr-2" />
              Call Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              onClick={handleWhatsApp}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>

      <Footer />

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t p-4 z-50">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleCall}>
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700" 
            onClick={handleWhatsApp}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
