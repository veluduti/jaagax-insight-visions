import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Users, MessageSquare, TrendingUp, LogOut, Building2, 
  Home, Phone, Mail, MapPin, Award, Star, CheckCircle2,
  Eye, Heart, Calendar, BarChart3, Navigation as NavigationIcon,
  Clock, MapPinned, Route
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import AgentEffortSummary from "@/components/agents/AgentEffortSummary";

interface AgentProfile {
  id: number;
  name: string;
  email?: string;
  photo_url: string;
  agency_name: string;
  cities_served: string;
  languages: string;
  sales_count: number;
  rent_count: number;
  trust_score: number;
  verified: boolean;
}

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  type: string;
  beds: number;
  images: string[];
  status: string;
}

export default function AgentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rankedLeads, setRankedLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    viewsThisMonth: 0,
    savedByUsers: 0,
  });
  const [visitStats, setVisitStats] = useState({
    upcomingVisits: 0,
    completedVisits: 0,
    pendingApprovals: 0,
    totalVisits: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndProfile();
  }, []);

  const fetchVisitStats = async (agentId: number) => {
    try {
      const { data: visits } = await supabase
        .from("visit_bookings")
        .select("status")
        .eq("agent_id", agentId);

      if (visits) {
        setVisitStats({
          upcomingVisits: visits.filter(v => 
            ["confirmed", "agent_pending", "builder_pending"].includes(v.status)
          ).length,
          completedVisits: visits.filter(v => v.status === "completed").length,
          pendingApprovals: visits.filter(v => 
            v.status === "agent_pending"
          ).length,
          totalVisits: visits.length,
        });
      }
    } catch (error) {
      console.error("Error fetching visit stats:", error);
    }
  };

  const fetchUserAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch user details
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    
    setUser(userData);

    // Find agent profile linked to this user
    const { data: agentData, error } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching agent profile:", error);
      toast.error("Could not load agent profile. Please contact support.");
      return;
    }

    if (!agentData) {
      toast.error("No agent profile found. Please complete your profile setup.");
      // Could redirect to profile setup page here
      return;
    }

    setAgentProfile(agentData);
    fetchAgentProperties(agentData.id);
    fetchVisitStats(agentData.id);
  };

  const fetchAgentProperties = async (agentId: number) => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("agent_id", agentId)
      .order("id", { ascending: false });

    if (data) {
      setProperties(data);
      setStats({
        totalProperties: data.length,
        activeListings: data.filter(p => p.status !== "Sold").length,
        viewsThisMonth: Math.floor(Math.random() * 1000) + 500,
        savedByUsers: Math.floor(Math.random() * 100) + 20,
      });
      
      // Fetch AI lead ranking
      fetchLeadRanking();
    }
  };

  const fetchLeadRanking = async () => {
    setLoadingLeads(true);
    try {
      // Mock leads data
      const mockLeads = [
        { leadId: '1', name: 'Rajesh Kumar', budget: 8000000, viewedProperties: 7, contacted: true },
        { leadId: '2', name: 'Priya Sharma', budget: 5000000, viewedProperties: 3, contacted: false },
        { leadId: '3', name: 'Amit Patel', budget: 12000000, viewedProperties: 12, contacted: true },
      ];

      const { data, error } = await supabase.functions.invoke('ai-rank-leads', {
        body: { leads: mockLeads }
      });

      if (!error && data?.rankedLeads) {
        setRankedLeads(data.rankedLeads);
      }
    } catch (error) {
      console.error('Lead ranking error:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  if (!user || !agentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="glass-panel border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-32 w-32">
              <AvatarImage src={agentProfile.photo_url} />
              <AvatarFallback className="text-2xl">
                {agentProfile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{agentProfile.name}</h2>
                {agentProfile.verified && (
                  <Badge className="bg-primary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Building2 className="h-4 w-4" />
                <span>{agentProfile.agency_name}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sales</p>
                  <p className="text-2xl font-bold text-primary">{agentProfile.sales_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rentals</p>
                  <p className="text-2xl font-bold text-primary">{agentProfile.rent_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trust Score</p>
                  <p className="text-2xl font-bold text-primary">{agentProfile.trust_score}/100</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Listings</p>
                  <p className="text-2xl font-bold text-primary">{stats.activeListings}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {agentProfile.cities_served}
                </Badge>
                <Badge variant="outline">
                  {agentProfile.languages}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => navigate("/dashboard/agent/visits")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  My Visits
                </Button>
                <Button variant="outline" onClick={() => navigate(`/agent/${agentProfile.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions for Visits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass-panel border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Visit Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your property visits and schedules
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/dashboard/agent/visits")}
                  className="bg-primary hover:bg-primary/90"
                >
                  View All Visits
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{visitStats.upcomingVisits}</p>
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{visitStats.completedVisits}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-500/5 rounded-lg">
                  <div className="p-2 bg-yellow-500/10 rounded-full">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{visitStats.pendingApprovals}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-lg">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <Route className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{visitStats.totalVisits}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Effort Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <AgentEffortSummary agentId={agentProfile.id} />
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProperties}</div>
                <p className="text-xs text-muted-foreground">All listings</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeListings}</div>
                <p className="text-xs text-muted-foreground">Currently available</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.viewsThisMonth}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saved</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.savedByUsers}</div>
                <p className="text-xs text-muted-foreground">By users</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Listings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Tabs defaultValue="active" className="w-full">
            <TabsList>
              <TabsTrigger value="active">Active Listings ({stats.activeListings})</TabsTrigger>
              <TabsTrigger value="all">All Properties ({stats.totalProperties})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties
                  .filter(p => p.status !== "Sold")
                  .map((property) => (
                    <Card 
                      key={property.id} 
                      className="glass-panel overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/property/${property.id}`)}
                    >
                      <div className="relative h-48">
                        <img
                          src={property.images[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400"}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2 bg-primary">
                          {property.status}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 truncate">{property.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.locality}, {property.city}
                        </p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(property.price)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {property.area} sq.ft
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{property.beds} BHK</span>
                          <span>•</span>
                          <span>{property.type}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {properties.filter(p => p.status !== "Sold").length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active listings yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card 
                    key={property.id} 
                    className="glass-panel overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/property/${property.id}`)}
                  >
                    <div className="relative h-48">
                      <img
                        src={property.images[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400"}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2">
                        {property.status}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 truncate">{property.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {property.locality}, {property.city}
                      </p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(property.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {property.area} sq.ft
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{property.beds} BHK</span>
                        <span>•</span>
                        <span>{property.type}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {properties.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No properties yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <Card className="glass-panel p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Overview
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Views</span>
                      <span className="font-bold">{stats.viewsThisMonth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Saves</span>
                      <span className="font-bold">{stats.savedByUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Conversion Rate</span>
                      <span className="font-bold text-green-500">
                        {((stats.savedByUsers / stats.viewsThisMonth) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="glass-panel p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your properties have been viewed {stats.viewsThisMonth} times this month
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.savedByUsers} users have saved your listings
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Trust score: {agentProfile.trust_score}/100
                    </p>
                  </div>
                </Card>
              </div>

              {/* AI Lead Prioritization */}
              <Card className="glass-panel p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  AI Lead Prioritization
                </h3>
                {loadingLeads ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : rankedLeads.length > 0 ? (
                  <div className="space-y-3">
                    {rankedLeads.map((lead: any, index: number) => (
                      <div key={lead.leadId} className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${
                            lead.priority === 'high' ? 'text-green-500' : 
                            lead.priority === 'medium' ? 'text-orange-500' : 'text-gray-500'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold">{lead.name || `Lead ${lead.leadId}`}</h4>
                            <p className="text-sm text-muted-foreground">{lead.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            lead.priority === 'high' ? 'bg-green-600' : 
                            lead.priority === 'medium' ? 'bg-orange-500' : 'bg-gray-500'
                          }>
                            Score: {lead.score}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No leads available</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
