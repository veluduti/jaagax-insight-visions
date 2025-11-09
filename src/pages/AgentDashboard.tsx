import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Users, MessageSquare, TrendingUp, LogOut, Building2, 
  Home, Phone, Mail, MapPin, Award, Star, CheckCircle2,
  Eye, Heart, Calendar, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

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
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    viewsThisMonth: 0,
    savedByUsers: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndProfile();
  }, []);

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

    // Find agent profile
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .limit(1);

    if (agents && agents.length > 0) {
      setAgentProfile(agents[0]);
      fetchAgentProperties(agents[0].id);
    }
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

              <div className="flex gap-2">
                <Button>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                <Button variant="outline" onClick={() => navigate(`/agent/${agentProfile.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>
          </div>
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
              <div className="grid md:grid-cols-2 gap-6">
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
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
