import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Home, BarChart, LogOut, Eye, Heart, 
  MessageSquare, TrendingUp, IndianRupee, Calendar,
  Edit, Trash2, CheckCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  type: string;
  images: string[];
  verified: boolean;
}

export default function SellerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalLeads: 0,
    soldProperties: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchProperties();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUser(data);
    }
    setLoading(false);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .limit(10)
      .order("id", { ascending: false });
    
    if (data) {
      setProperties(data);
      setStats({
        totalListings: data.length,
        activeListings: data.filter(p => p.verified).length,
        totalViews: Math.floor(Math.random() * 5000) + 1000,
        totalLeads: Math.floor(Math.random() * 100) + 20,
        soldProperties: Math.floor(Math.random() * 10) + 2,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user?.name || "Seller"}!</h1>
              <p className="text-muted-foreground">Manage your property listings</p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Listings</p>
                  <p className="text-2xl font-bold">{stats.totalListings}</p>
                </div>
                <Home className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.activeListings}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sold</p>
                  <p className="text-2xl font-bold">{stats.soldProperties}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/sell")}>
              <CardContent className="p-6 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Add Property</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/valuation")}>
              <CardContent className="p-6 text-center">
                <IndianRupee className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Get Valuation</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/agents")}>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Find Agent</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <BarChart className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">View Analytics</h3>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* My Listings */}
          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Property Listings</CardTitle>
                    <CardDescription>Manage and track your properties</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/sell")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No properties listed yet</h3>
                    <p className="text-muted-foreground mb-4">Start by adding your first property</p>
                    <Button onClick={() => navigate("/sell")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <motion.div
                        key={property.id}
                        whileHover={{ x: 5 }}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate(`/property/${property.id}`)}
                      >
                        <img
                          src={property.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"}
                          alt={property.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{property.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {property.locality}, {property.city}
                              </p>
                            </div>
                            {property.verified ? (
                              <Badge className="bg-green-600">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-6 mt-2 text-sm">
                            <span className="font-semibold text-primary text-lg">
                              {formatPrice(property.price)}
                            </span>
                            <span className="text-muted-foreground">{property.beds} Beds</span>
                            <span className="text-muted-foreground">{property.baths} Baths</span>
                            <span className="text-muted-foreground">{property.area} sq.ft</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={(e) => e.stopPropagation()}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Property Inquiries</CardTitle>
                <CardDescription>Manage buyer inquiries and leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No inquiries yet</h3>
                  <p className="text-muted-foreground">Leads will appear here when buyers contact you</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Track your listing performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 bg-primary/10 rounded-lg">
                    <Eye className="h-8 w-8 text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-3xl font-bold">{stats.totalViews}</p>
                    <p className="text-sm text-green-600 mt-2">+12% this week</p>
                  </div>

                  <div className="p-6 bg-orange-500/10 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-orange-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-3xl font-bold">{stats.totalLeads}</p>
                    <p className="text-sm text-green-600 mt-2">+8% this week</p>
                  </div>

                  <div className="p-6 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <p className="text-sm text-muted-foreground">Properties Sold</p>
                    <p className="text-3xl font-bold">{stats.soldProperties}</p>
                    <p className="text-sm text-green-600 mt-2">Success rate: 65%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Viewing Schedule</CardTitle>
                <CardDescription>Manage property viewing appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No scheduled viewings</h3>
                  <p className="text-muted-foreground">Property viewing appointments will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
