import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { 
  Heart, MapPin, Search, Bell, Calculator, 
  TrendingUp, Calendar, MessageSquare, LogOut,
  Home, Building2, Filter, Star, ChevronRight,
  GitCompare, DollarSign, Eye, Clock, Share2, Route, Hotel
} from "lucide-react";
import { motion } from "framer-motion";
import MyJourneyTimeline from "@/components/buyer/MyJourneyTimeline";
import MyBookings from "@/components/buyer/MyBookings";
import MyVisits from "@/components/buyer/MyVisits";

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

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<Property[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [visitBookings, setVisitBookings] = useState<any[]>([]);
  
  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTenure, setLoanTenure] = useState(20);
  const [emi, setEmi] = useState(0);

  useEffect(() => {
    fetchUserData();
    fetchProperties();
    fetchFavorites();
    fetchVisitBookings();
    
    // Subscribe to real-time visit updates
    const channel = supabase
      .channel('buyer-visit-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visit_bookings'
        },
        (payload) => {
          console.log('Visit booking updated:', payload);
          fetchVisitBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchAISuggestions();
    }
  }, [user]);

  useEffect(() => {
    calculateEMI();
  }, [loanAmount, interestRate, loanTenure]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setUser(data);
    }
    setLoading(false);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .limit(6)
      .order("created_at", { ascending: false });
    if (data) setProperties(data);
  };

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user.id);
      
      if (data) {
        // property_id is UUID (string)
        setFavorites(data.map(f => f.property_id).filter(Boolean) as string[]);
      }
    }
  };

  const fetchVisitBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("visit_bookings")
        .select("*, properties(title, locality, city)")
        .eq("user_id", user.id)
        .order("visit_date", { ascending: true })
        .limit(3);
      
      if (data) {
        setVisitBookings(data);
      }
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to save favorites");
      return;
    }

    if (favorites.includes(propertyId)) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);
      setFavorites(favorites.filter(id => id !== propertyId));
      toast.success("Removed from favorites");
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, property_id: propertyId });
      setFavorites([...favorites, propertyId]);
      toast.success("Added to favorites");
    }
  };

  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggest-properties', {
        body: { 
          userId: user.id, 
          city: user.city || 'Hyderabad',
          minPrice: 3000000,
          maxPrice: 10000000,
          bhk: 3
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        const { data: suggestedProps } = await supabase
          .from('properties')
          .select('*')
          .in('id', data.suggestions);
        
        if (suggestedProps) setAiSuggestions(suggestedProps);
      }
    } catch (error) {
      console.error('AI Suggestions error:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const calculateEMI = () => {
    const principal = loanAmount;
    const ratePerMonth = interestRate / 12 / 100;
    const numberOfMonths = loanTenure * 12;
    
    const emiValue = (principal * ratePerMonth * Math.pow(1 + ratePerMonth, numberOfMonths)) / 
                     (Math.pow(1 + ratePerMonth, numberOfMonths) - 1);
    
    setEmi(Math.round(emiValue));
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
              <h1 className="text-2xl font-bold">Welcome back, {user?.name || "Buyer"}!</h1>
              <p className="text-muted-foreground">Find your dream property</p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/map")}>
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Explore Map</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/visit/analytics")}>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Visit Analytics</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/compare")}>
              <CardContent className="p-6 text-center">
                <GitCompare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Compare</h3>
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
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/valuation")}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Property Value</h3>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="recommended" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
            <TabsTrigger value="recommended">
              <Star className="h-4 w-4 mr-2" />
              For You
            </TabsTrigger>
            <TabsTrigger value="journey">
              <Route className="h-4 w-4 mr-2" />
              Journey
            </TabsTrigger>
            <TabsTrigger value="visits">
              <Calendar className="h-4 w-4 mr-2" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Hotel className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              EMI
            </TabsTrigger>
            <TabsTrigger value="searches">
              <Search className="h-4 w-4 mr-2" />
              Searches
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* Recommended Properties */}
          <TabsContent value="recommended" className="space-y-6">
            {/* AI Suggestions Banner */}
            {aiSuggestions.length > 0 && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    AI-Powered Recommendations
                  </CardTitle>
                  <CardDescription>
                    Smart suggestions tailored to your preferences using AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {aiSuggestions.slice(0, 3).map((property) => (
                      <motion.div
                        key={property.id}
                        whileHover={{ y: -5 }}
                        className="cursor-pointer"
                        onClick={() => navigate(`/property/${property.id}`)}
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all">
                          <div className="relative h-32">
                            <img
                              src={property.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                            <Badge className="absolute top-2 left-2 bg-primary">AI Match</Badge>
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold text-sm mb-1 line-clamp-1">{property.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2">{property.locality}</p>
                            <p className="text-lg font-bold text-primary">{formatPrice(property.price)}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>All Recommended Properties</CardTitle>
                <CardDescription>Based on your preferences and search history</CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                    <p className="text-muted-foreground mb-4">Seed data from the Map page to see properties</p>
                    <Button onClick={() => navigate("/map")}>Go to Map</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <motion.div
                        key={property.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer"
            onClick={() => navigate(`/property/${property.id}`)}
          >
            <Card className="overflow-hidden h-full hover:shadow-xl transition-all">
              <div className="relative">
                <img
                  src={property.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"}
                  alt={property.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(property.id);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${favorites.includes(property.id) ? "fill-red-500 text-red-500" : ""}`}
                  />
                </Button>
                            {property.verified && (
                              <Badge className="absolute top-2 left-2 bg-green-600">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {property.locality}, {property.city}
                            </p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-bold text-primary">
                                {formatPrice(property.price)}
                              </span>
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>{property.bedrooms || property.bhk} Beds</span>
                                <span>•</span>
                                <span>{property.bathrooms} Baths</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{property.area_sqft} sq.ft</span>
                              <span className="flex items-center text-primary font-semibold">
                                View Details
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Journey */}
          <TabsContent value="journey">
            <MyJourneyTimeline />
          </TabsContent>

          {/* My Bookings */}
          <TabsContent value="bookings">
            <MyBookings />
          </TabsContent>

          {/* Favorites */}
          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle>Your Favorite Properties</CardTitle>
                <CardDescription>Properties you've saved for later ({favorites.length})</CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                    <p className="text-muted-foreground mb-4">Start saving properties you like</p>
                    <Button onClick={() => navigate("/map")}>Browse Properties</Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">You have {favorites.length} favorite properties</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMI Calculator */}
          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>EMI Calculator</CardTitle>
                <CardDescription>Calculate your monthly home loan payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Loan Amount: {formatPrice(loanAmount)}</Label>
                      <Slider
                        value={[loanAmount]}
                        onValueChange={(value) => setLoanAmount(value[0])}
                        min={1000000}
                        max={50000000}
                        step={100000}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Interest Rate: {interestRate}% per annum</Label>
                      <Slider
                        value={[interestRate]}
                        onValueChange={(value) => setInterestRate(value[0])}
                        min={6}
                        max={15}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Loan Tenure: {loanTenure} years</Label>
                      <Slider
                        value={[loanTenure]}
                        onValueChange={(value) => setLoanTenure(value[0])}
                        min={5}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 bg-primary/10 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">Monthly EMI</p>
                      <p className="text-4xl font-bold text-primary">{formatPrice(emi)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Principal</p>
                        <p className="text-lg font-semibold">{formatPrice(loanAmount)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                        <p className="text-lg font-semibold">{formatPrice((emi * loanTenure * 12) - loanAmount)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Total Payment</p>
                        <p className="text-lg font-semibold">{formatPrice(emi * loanTenure * 12)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Visits */}
          <TabsContent value="visits">
            <MyVisits />
          </TabsContent>

          {/* Saved Searches */}
          <TabsContent value="searches">
            <Card>
              <CardHeader>
                <CardTitle>Saved Searches</CardTitle>
                <CardDescription>Get alerts when new properties match your criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No saved searches</h3>
                  <p className="text-muted-foreground mb-4">Save your search criteria to get instant alerts</p>
                  <Button onClick={() => navigate("/map")}>Start Searching</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Property Alerts</CardTitle>
                <CardDescription>Stay updated with new listings and price changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No alerts</h3>
                  <p className="text-muted-foreground mb-4">Enable notifications to get instant property alerts</p>
                  <Button>Enable Notifications</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Market Insights */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
            <CardDescription>Latest trends in Hyderabad & Vijayawada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-primary/5 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-2xl">+12%</h3>
                <p className="text-sm text-muted-foreground">Price Growth (YoY)</p>
              </div>
              <div className="text-center p-6 bg-primary/5 rounded-lg">
                <Home className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold text-2xl">{properties.length}</h3>
                <p className="text-sm text-muted-foreground">New Listings</p>
              </div>
              <div className="text-center p-6 bg-primary/5 rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold text-2xl">45 Days</h3>
                <p className="text-sm text-muted-foreground">Avg. Days on Market</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerDashboard;
