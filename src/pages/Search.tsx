import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertyCardWithAI from "@/components/search/PropertyCardWithAI";
import AgentCard from "@/components/agents/AgentCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { 
  Sparkles, MapPin, SlidersHorizontal, Building2, Shield, 
  TrendingUp, ChevronRight, Users, Home, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdvancedFiltersSheet from "@/components/search/AdvancedFiltersSheet";

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  trust_score: number | null;
}

interface Project {
  id: string;
  name: string;
  builder_name: string;
  city: string;
  locality: string;
  avg_price: number | null;
  verified: boolean | null;
  trust_score: number | null;
  rera_id: string | null;
  image: string | null;
}

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

interface PropertyDecision {
  property_id: number;
  match_score: number;
  ai_verdict: "best_for_you" | "alternative" | "risky";
  risk_flags: string[];
  positive_flags: string[];
  reasoning: {
    life_stage_fit: boolean;
    budget_comfort: "good" | "tight" | "stretch";
    delay_risk: "low" | "medium" | "high";
    trust_level: "high" | "medium" | "low";
  };
}

// Session cache for AI decisions
const decisionCache = new Map<string, PropertyDecision[]>();

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { buyerContext, hasBuyerContext } = useBuyerContext();
  
  // Tab state
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "properties");
  
  // Search state
  const [location, setLocation] = useState(searchParams.get("city") || searchParams.get("q") || "");
  const [searchType, setSearchType] = useState(searchParams.get("type") || "buy");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [decisions, setDecisions] = useState<Map<number, PropertyDecision>>(new Map());
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    propertyType: "residential",
    beds: "any",
    budget: "any",
    handoverBy: "any",
    paymentPlan: "any",
    completion: "any",
    furnishing: "any",
    amenities: [] as string[],
    floorLevel: "any",
    parkingSpaces: "any",
    monthlyRent: "any",
    deposit: "any",
    preferredTenants: "any",
    availableFrom: "any",
    possessionStatus: "any",
    propertyAge: "any"
  });
  
  const lastSearchKey = useRef<string>("");
  const popularLocations = ["Hyderabad", "Vijayawada", "Vizag", "Guntur", "Bangalore"];

  const navItems = [
    { label: "Properties", value: "properties", icon: Home },
    { label: "New Projects", value: "new-projects", icon: Building2 },
    { label: "Transactions", value: "transactions", icon: BarChart3 },
    { label: "Agents", value: "agents", icon: Users },
  ];

  // Fetch data when tab or filters change
  useEffect(() => {
    fetchData();
  }, [activeTab, location, searchType]);

  // Fetch AI decisions for properties
  useEffect(() => {
    if (activeTab === "properties" && properties.length > 0 && user && role === "buyer" && hasBuyerContext) {
      fetchAIDecisions();
    }
  }, [properties, user, role, hasBuyerContext, buyerContext, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "properties":
          await fetchProperties();
          break;
        case "new-projects":
          await fetchProjects();
          break;
        case "transactions":
          await fetchTransactions();
          break;
        case "agents":
          await fetchAgents();
          break;
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    let queryBuilder = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("verified", true);

    if (location) {
      queryBuilder = queryBuilder.or(`title.ilike.%${location}%,locality.ilike.%${location}%,city.ilike.%${location}%`);
    }

    const { data, error, count } = await queryBuilder
      .order("trust_score", { ascending: false })
      .limit(50);

    if (!error) {
      setProperties(data || []);
      setTotal(count || 0);
    }
  };

  const fetchProjects = async () => {
    let queryBuilder = supabase
      .from("projects")
      .select("*", { count: "exact" })
      .eq("verified", true);

    if (location) {
      queryBuilder = queryBuilder.or(`name.ilike.%${location}%,locality.ilike.%${location}%,city.ilike.%${location}%`);
    }

    const { data, error, count } = await queryBuilder
      .order("trust_score", { ascending: false })
      .limit(50);

    if (!error) {
      setProjects(data || []);
      setTotal(count || 0);
    }
  };

  const fetchAgents = async () => {
    let queryBuilder = supabase
      .from("agents")
      .select("*", { count: "exact" });

    if (location) {
      queryBuilder = queryBuilder.or(`name.ilike.%${location}%,cities_served.ilike.%${location}%`);
    }

    const { data, error, count } = await queryBuilder
      .order("sales_count", { ascending: false })
      .limit(50);

    if (!error) {
      setAgents(data || []);
      setTotal(count || 0);
    }
  };

  const fetchTransactions = async () => {
    // Use properties as transaction data
    let queryBuilder = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("verified", true);

    if (location) {
      queryBuilder = queryBuilder.or(`locality.ilike.%${location}%,city.ilike.%${location}%`);
    }

    const { data, error, count } = await queryBuilder
      .order("price", { ascending: false })
      .limit(50);

    if (!error) {
      setProperties(data || []);
      setTotal(count || 0);
    }
  };

  const fetchAIDecisions = async () => {
    if (!buyerContext) return;

    const propertyIds = properties.map((p) => p.id).sort().join(",");
    const cacheKey = `${user?.id}-${propertyIds}`;

    if (decisionCache.has(cacheKey)) {
      const cached = decisionCache.get(cacheKey)!;
      const decisionMap = new Map<number, PropertyDecision>();
      cached.forEach((d) => decisionMap.set(d.property_id, d));
      setDecisions(decisionMap);
      return;
    }

    if (lastSearchKey.current === cacheKey) return;
    lastSearchKey.current = cacheKey;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-property-decision", {
        body: {
          properties: properties.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            verified: p.verified,
            trust_score: p.trust_score,
            bhk: p.bhk,
            type: p.type,
            locality: p.locality,
          })),
          buyerContext: {
            life_stage: buyerContext.life_stage,
            budget_comfort: buyerContext.budget_comfort,
            primary_fear: buyerContext.primary_fear,
            decision_mode: buyerContext.decision_mode,
            confidence_score: buyerContext.confidence_score,
          },
        },
      });

      if (!error && data?.decisions) {
        decisionCache.set(cacheKey, data.decisions);
        const decisionMap = new Map<number, PropertyDecision>();
        data.decisions.forEach((d: PropertyDecision) => {
          decisionMap.set(d.property_id, d);
        });
        setDecisions(decisionMap);
      }
    } catch (error) {
      console.error("AI Decision fetch error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (location) params.set("city", location);
    if (searchType !== "buy") params.set("type", searchType);
    setSearchParams(params);
    fetchData();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params);
  };

  const showAIFeatures = user && role === "buyer" && hasBuyerContext && activeTab === "properties";

  const getTabTitle = () => {
    switch (activeTab) {
      case "properties": return "Properties";
      case "new-projects": return "New Projects";
      case "transactions": return "Transactions";
      case "agents": return "Agents";
      default: return "Search";
    }
  };

  const getResultCount = () => {
    switch (activeTab) {
      case "properties":
      case "transactions":
        return properties.length;
      case "new-projects":
        return projects.length;
      case "agents":
        return agents.length;
      default:
        return total;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const renderTransactionTabs = () => {
    if (activeTab === 'agents') return null;
    
    const tabs = activeTab === 'transactions' 
      ? [{ value: 'sold', label: 'Sold' }, { value: 'rented', label: 'Rented' }]
      : [{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }];

    return (
      <>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSearchType(tab.value)}
            className={`py-2.5 px-6 text-sm font-medium rounded-lg transition-all ${
              searchType === tab.value
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </>
    );
  };

  // Render results based on active tab
  const renderResults = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    switch (activeTab) {
      case "properties":
        return properties.length === 0 ? (
          <EmptyState message="No properties found" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {properties.map((property, index) => (
              <PropertyCardWithAI
                key={property.id}
                property={property}
                decision={showAIFeatures ? decisions.get(property.id) : undefined}
                index={index}
              />
            ))}
          </motion.div>
        );

      case "new-projects":
        return projects.length === 0 ? (
          <EmptyState message="No projects found" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 h-full"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={project.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800"}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    
                    {project.rera_id && (
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                        <Shield className="h-3 w-3 mr-1" />
                        RERA Verified
                      </Badge>
                    )}

                    {project.trust_score > 80 && (
                      <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border-primary/50">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Trust: {project.trust_score}
                      </Badge>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 line-clamp-1">{project.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.builder_name || "Builder"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-1">{project.locality}, {project.city}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div>
                        <span className="text-xs text-muted-foreground">Starting from</span>
                        <p className="text-xl font-bold text-primary">
                          {formatPrice(project.avg_price)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary">
                        View <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        );

      case "transactions":
        return properties.length === 0 ? (
          <EmptyState message="No transactions found" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={property.images?.[0] || "/placeholder.svg"}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 bg-green-500 text-white">
                      {searchType === "rented" ? "Rented" : "Sold"}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      +{(5 + Math.random() * 10).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{property.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{property.locality}, {property.city}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(property.price)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {property.area_sqft} sq.ft
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        );

      case "agents":
        return agents.length === 0 ? (
          <EmptyState message="No agents found" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {agents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} />
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16">
        <div className="container-padding max-w-7xl mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Search {getTabTitle()}
            </h1>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <p className="text-muted-foreground">
                {getResultCount() > 0 ? `Found ${getResultCount()} ${getTabTitle().toLowerCase()}` : `Search for ${getTabTitle().toLowerCase()}`}
              </p>
              {showAIFeatures && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-powered insights enabled
                </Badge>
              )}
              {loadingAI && (
                <Badge variant="outline" className="animate-pulse">
                  Analyzing...
                </Badge>
              )}
            </div>
            
            {/* Search Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-5xl mx-auto"
              >
                <div className="bg-card/95 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden border border-border/50">
                  {/* Navigation Tabs */}
                  <div className="flex justify-center gap-6 px-4 pt-3 pb-2.5 bg-background/50 border-b border-border/30">
                    {navItems.map(item => (
                      <button
                        key={item.value}
                        onClick={() => handleTabChange(item.value)}
                        className={`text-sm font-medium transition-colors relative pb-1.5 flex items-center gap-1.5 ${
                          activeTab === item.value 
                            ? 'text-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {activeTab === item.value && (
                          <motion.span
                            layoutId="activeSearchTab"
                            className="absolute -bottom-[11px] left-0 right-0 h-0.5 bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Search Form */}
                  <div className="p-4 space-y-3">
                    {/* Transaction Type + Location + Search Row */}
                    <div className="flex gap-2 items-center flex-wrap">
                      {renderTransactionTabs()}

                      {/* Location Input */}
                      <div className="relative flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/30 focus-within:border-primary/50 transition-colors">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <Input
                            placeholder="Enter location"
                            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-muted-foreground"
                            value={location}
                            onChange={(e) => {
                              setLocation(e.target.value);
                              setShowSuggestions(e.target.value.length > 0);
                            }}
                            onFocus={() => setShowSuggestions(location.length > 0 || true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyPress={handleKeyPress}
                          />
                        </div>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute z-[60] w-full mt-1 bg-popover rounded-lg overflow-hidden border border-border/50 shadow-xl"
                          >
                            {popularLocations
                              .filter((loc) => !location || loc.toLowerCase().includes(location.toLowerCase()))
                              .map((loc, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setLocation(loc);
                                    setShowSuggestions(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 border-b border-border/30 last:border-0 text-sm"
                                >
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-foreground">{loc}</span>
                                </button>
                              ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Search Button */}
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-8 py-2.5 rounded-lg shadow hover:shadow-md transition-all"
                        onClick={handleSearch}
                      >
                        Search
                      </Button>
                    </div>

                    {/* Filters Row */}
                    {(activeTab === 'properties' || activeTab === 'transactions' || activeTab === 'new-projects') && (
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          variant="outline"
                          onClick={() => setShowMoreFilters(true)}
                          className="h-10 text-sm bg-background/80 border-border/50 hover:bg-primary/5 hover:border-primary/30 gap-2 transition-all group"
                        >
                          <SlidersHorizontal className="h-4 w-4 group-hover:text-primary transition-colors" />
                          <span>More Filters</span>
                          {(advancedFilters.amenities.length > 0 || advancedFilters.furnishing !== "any") && (
                            <Badge className="ml-1 bg-primary/10 text-primary border-primary/30">
                              {advancedFilters.amenities.length + (advancedFilters.furnishing !== "any" ? 1 : 0)}
                            </Badge>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Prompt */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 text-center"
                >
                  <button
                    onClick={() => navigate('/ai-advisor')}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Want to find out more about real estate using AI?</span>
                    <span className="text-primary font-medium">Try AI Advisor →</span>
                  </button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Results */}
          {renderResults()}
        </div>
      </div>

      <Footer />

      {/* Advanced Filters Sheet */}
      <AdvancedFiltersSheet
        open={showMoreFilters}
        onOpenChange={setShowMoreFilters}
        activeTab={activeTab}
        searchType={searchType}
        filters={advancedFilters}
        onFiltersChange={(newFilters) => {
          setAdvancedFilters({
            ...advancedFilters,
            ...newFilters
          });
        }}
      />
    </div>
  );
};

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-16"
  >
    <div className="glass-card p-12 max-w-md mx-auto">
      <p className="text-xl text-muted-foreground mb-4">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">
        Try adjusting your search criteria
      </p>
    </div>
  </motion.div>
);

export default Search;
