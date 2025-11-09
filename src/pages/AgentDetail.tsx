import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  MapPin,
  Star,
  MessageSquare,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  Shield,
  ChevronLeft,
  Award,
  Home,
  Loader2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
  city: string;
  avatar_url: string | null;
  verified: boolean;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  property: string;
}

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Mock data for demo
  const stats = {
    dealsCompleted: 47,
    activeListings: 12,
    avgResponseTime: "2 hours",
    yearsExperience: 8,
    trustScore: 92,
    rating: 4.7,
    totalReviews: 38,
  };

  const specialties = ["Residential", "Luxury Homes", "Investment Properties"];

  useEffect(() => {
    if (id) {
      fetchAgentDetails();
    }
  }, [id]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      
      const agentId = parseInt(id || "0");

      // Fetch agent profile
      const { data: agentData, error: agentError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch agent's properties (portfolio)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .eq("agent_id", agentId)
        .eq("verified", true)
        .limit(6);

      if (!propertiesError) {
        setPortfolio(propertiesData || []);
      }

      // Mock reviews (in production, fetch from reviews table)
      setReviews([
        {
          id: "1",
          author: "Rajesh Kumar",
          rating: 5,
          comment: "Excellent service! Very professional and helped me find my dream home.",
          date: "2024-10-15",
          property: "3 BHK in Kokapet",
        },
        {
          id: "2",
          author: "Priya Sharma",
          rating: 5,
          comment: "Highly recommended. Great market knowledge and negotiation skills.",
          date: "2024-09-28",
          property: "Villa in Narsingi",
        },
        {
          id: "3",
          author: "Amit Patel",
          rating: 4,
          comment: "Good experience overall. Very responsive and knowledgeable.",
          date: "2024-09-10",
          property: "Commercial Space",
        },
      ]);
    } catch (error) {
      console.error("Error fetching agent details:", error);
      toast.error("Failed to load agent profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <Navigation />
        <div className="container mx-auto px-6 py-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />

      <div className="container mx-auto px-6 py-24">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/agents")} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>

        {/* Agent Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-xl mb-8"
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary/50">
                <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80">
                  {agent.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {agent.verified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{agent.name}</h1>
                  <div className="flex items-center gap-4 text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {agent.city || "Multiple Cities"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {stats.yearsExperience} years experience
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    <span className="text-xl font-bold">{stats.rating}</span>
                    <span className="text-muted-foreground">({stats.totalReviews} reviews)</span>
                  </div>
                </div>

                {/* Trust Score Badge */}
                <div className="text-center">
                  <div className="relative w-20 h-20 mb-2">
                    <svg className="transform -rotate-90 w-20 h-20">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="hsl(var(--border))"
                        strokeWidth="5"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="hsl(var(--primary))"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={`${(stats.trustScore / 100) * 226.19} 226.19`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{stats.trustScore}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Trust Score</p>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-2 mb-6">
                {specialties.map((specialty, i) => (
                  <Badge key={i} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => toast.info("Chat feature coming soon!")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
                <Button size="lg" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
                <Button size="lg" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deals Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.dealsCompleted}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeListings}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgResponseTime}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalReviews}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="portfolio" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="mt-0">
              {portfolio.length === 0 ? (
                <Card className="glass-panel">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No properties in portfolio yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolio.map((property) => (
                    <Card
                      key={property.id}
                      className="glass-panel overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300"
                      onClick={() => navigate(`/property/${property.id}`)}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={
                            property.images?.[0] ||
                            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
                          }
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {property.verified && (
                          <Badge className="absolute top-3 left-3 bg-green-500/90 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold mb-2 line-clamp-1">{property.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.locality}, {property.city}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            ₹{(property.price / 10000000).toFixed(2)}Cr
                          </span>
                          <Badge variant="outline">{property.bhk} BHK</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="glass-panel">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold mb-1">{review.author}</h3>
                          <p className="text-sm text-muted-foreground">{review.property}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">{review.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default AgentDetail;
