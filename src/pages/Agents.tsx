import { useState, useEffect } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AgentCard from "@/components/agents/AgentCard";
import FeaturedAgents from "@/components/agents/FeaturedAgents";
import AIAgentRecommendations from "@/components/agents/AIAgentRecommendations";

interface Agent {
  id: string;
  name: string | null;
  agency_name: string | null;
  languages: string[] | null;
  cities_served: string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  photo_url: string | null;
  trust_score: number | null;
  verified: boolean | null;
}

const Agents = () => {
  const { detectedLocation } = useLocationContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceType, setServiceType] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("sales");
  const [loading, setLoading] = useState(true);

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city) {
      setCityFilter(detectedLocation.city);
    }
  }, [detectedLocation]);

  useEffect(() => {
    fetchAgents();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [agents, searchQuery, serviceType, cityFilter, verifiedOnly, sortBy]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("sales_count", { ascending: false });

      if (error) throw error;

      // Auto-seed if empty
      if (!data || data.length === 0) {
        const { seedAgents } = await import("@/utils/seedAgents");
        await seedAgents();
        const { data: newData } = await supabase
          .from("agents")
          .select("*")
          .order("sales_count", { ascending: false });
        setAgents(newData || []);
        setFilteredAgents(newData || []);
      } else {
        setAgents(data || []);
        setFilteredAgents(data || []);
      }
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
          (agent.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (agent.cities_served || []).some(city => city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((agent) =>
        (agent.cities_served || []).some(city => city.toLowerCase().includes(cityFilter.toLowerCase()))
      );
    }

    // Verified only filter
    if (verifiedOnly) {
      filtered = filtered.filter((agent) => agent.verified);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "sales") {
        return (b.sales_count || 0) - (a.sales_count || 0);
      } else if (sortBy === "rent") {
        return (b.rent_count || 0) - (a.rent_count || 0);
      }
      return 0;
    });

    setFilteredAgents(filtered);
  };

  const cities = Array.from(
    new Set(
      agents
        .flatMap((agent) => agent.cities_served || [])
        .filter(Boolean)
    )
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Perfect Agent
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with verified TruBrokers™ across India
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-6 max-w-5xl mx-auto"
          >
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents by name or area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={verifiedOnly}
                    onCheckedChange={setVerifiedOnly}
                    id="verified"
                  />
                  <Label htmlFor="verified">Verified Only</Label>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Most Sales</SelectItem>
                    <SelectItem value="rent">Most Rentals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredAgents.length} agents found
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Agents */}
      <FeaturedAgents agents={filteredAgents} />

      {/* AI Recommendations */}
      <AIAgentRecommendations />

      {/* All Agents Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-xl p-6 animate-pulse"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No agents found matching your criteria
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent, idx) => (
                <AgentCard key={agent.id} agent={agent} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Agents;
