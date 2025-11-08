import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User,
  MapPin,
  Star,
  MessageSquare,
  Phone,
  Building2,
  TrendingUp,
  Shield,
  Loader2,
  Search,
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
  trust_score?: number;
  specialties?: string[];
  rating?: number;
  deals_closed?: number;
}

const Agents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");

  const cities = ["all", "Hyderabad", "Vijayawada"];
  const ratings = [
    { label: "All Ratings", value: "all" },
    { label: "4.5+ Stars", value: "4.5" },
    { label: "4+ Stars", value: "4" },
    { label: "3.5+ Stars", value: "3.5" },
  ];

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCity, selectedRating, agents]);

  const fetchAgents = async () => {
    try {
      setLoading(true);

      // Get users who have the 'agent' role
      const { data: agentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      if (rolesError) throw rolesError;

      const agentIds = agentRoles?.map((r) => r.user_id) || [];

      if (agentIds.length === 0) {
        setAgents([]);
        setFilteredAgents([]);
        setLoading(false);
        return;
      }

      // Fetch agent profiles
      const { data: agentsData, error: agentsError } = await supabase
        .from("users")
        .select("*")
        .in("id", agentIds)
        .eq("verified", true);

      if (agentsError) throw agentsError;

      // Enrich with mock data for demo (in production, this would come from a real agents table)
      const enrichedAgents = (agentsData || []).map((agent) => ({
        ...agent,
        trust_score: Math.floor(Math.random() * 20) + 80, // 80-100
        rating: parseFloat((Math.random() * 1 + 4).toFixed(1)), // 4.0-5.0
        deals_closed: Math.floor(Math.random() * 50) + 10,
        specialties: [
          ["Residential", "Luxury Homes"],
          ["Commercial", "Office Spaces"],
          ["Plots", "Land Development"],
          ["Residential", "Investment Properties"],
        ][Math.floor(Math.random() * 4)],
      }));

      setAgents(enrichedAgents);
      setFilteredAgents(enrichedAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...agents];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter((agent) => agent.city === selectedCity);
    }

    // Rating filter
    if (selectedRating !== "all") {
      const minRating = parseFloat(selectedRating);
      filtered = filtered.filter((agent) => (agent.rating || 0) >= minRating);
    }

    setFilteredAgents(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />

      <div className="container mx-auto px-6 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            Find Your <span className="text-gradient">Agent</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with verified real estate experts in your area
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 mb-8 rounded-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city === "all" ? "All Cities" : city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger>
                <SelectValue placeholder="Minimum Rating" />
              </SelectTrigger>
              <SelectContent>
                {ratings.map((rating) => (
                  <SelectItem key={rating.value} value={rating.value}>
                    {rating.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-6 text-muted-foreground">
          Found <span className="text-primary font-semibold">{filteredAgents.length}</span> verified agents
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass-panel border-border/50 overflow-hidden group hover:border-primary/50 transition-all duration-300 cursor-pointer h-full"
                  onClick={() => navigate(`/agent/${agent.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/50">
                          {agent.avatar_url ? (
                            <img
                              src={agent.avatar_url}
                              alt={agent.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                              <User className="h-10 w-10 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        {agent.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                            <Shield className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 line-clamp-1">{agent.name}</h3>
                        
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold">{agent.rating?.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">
                            ({agent.deals_closed} deals)
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {agent.city || "Multiple Cities"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Trust Score */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Trust Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent"
                            style={{ width: `${agent.trust_score}%` }}
                          />
                        </div>
                        <span className="font-semibold text-sm">{agent.trust_score}/100</span>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.specialties?.map((specialty, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("Chat feature coming soon!");
                        }}
                        className="w-full"
                      >
                        <MessageSquare className="h-3 w-3 mr-2" />
                        Chat
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/agent/${agent.id}`);
                        }}
                        className="w-full"
                      >
                        <Building2 className="h-3 w-3 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Agents;
