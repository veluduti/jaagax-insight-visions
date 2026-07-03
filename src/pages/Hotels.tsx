import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { 
  Hotel, 
  MapPin, 
  Star, 
  Wifi, 
  Coffee, 
  Car, 
  Utensils, 
  Dumbbell, 
  Waves, 
  Tv, 
  Snowflake,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  Calendar,
  Users,
  Bed,
  DollarSign,
  Clock,
  Shield,
  Sparkles,
  Heart,
  Share2,
  Phone,
  Mail,
  Map,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { HotelOnlyBooking } from "@/components/hotels/HotelOnlyBooking";
import { WeekendExplorerWizard } from "@/components/booking/WeekendExplorerWizard";
import { QuickVisitWizard } from "@/components/booking/QuickVisitWizard";
import MyHotelApplicationsBanner from "@/components/hotels/MyHotelApplicationsBanner";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string | null;
  star_rating: number | null;
  price_per_night: number;
  discount_percentage: number | null;
  amenities: string[] | null;
  images: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  partner_since: string | null;
  is_active: boolean | null;
}

interface VisitPackage {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  includes_airport_pickup: boolean | null;
  includes_meals: boolean | null;
  includes_local_transport: boolean | null;
  base_discount_percentage: number | null;
  is_active: boolean | null;
}

const Hotels = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { detectedLocation } = useLocation();
  const { user, role } = useAuth();
  
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hotelsRes, packagesRes] = await Promise.all([
          supabase.from("partner_hotels").select("*").eq("is_active", true).order("star_rating", { ascending: false }),
          supabase.from("visit_packages").select("*").eq("is_active", true),
        ]);
        setHotels(hotelsRes.data || []);
        setPackages(packagesRes.data || []);
      } catch (err) {
        console.error("Error fetching hotels:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Search state
  const [location, setLocation] = useState(searchParams.get('city') || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter state
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [starRating, setStarRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"price" | "rating" | "popularity">("rating");

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city && !searchParams.get('city')) {
      const matchedCity = popularLocations.find(
        c => c.toLowerCase() === detectedLocation.city.toLowerCase()
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
        setLocation(matchedCity);
      }
    }
  }, [detectedLocation]);

  // Modal state
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showVisitStayModal, setShowVisitStayModal] = useState(false);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [preSelectedPackage, setPreSelectedPackage] = useState<VisitPackage | null>(null);
  const [weekendPackage, setWeekendPackage] = useState<VisitPackage | null>(null);
  const [quickVisitPackage, setQuickVisitPackage] = useState<VisitPackage | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai"];

  // Get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes("wifi")) return <Wifi className="h-4 w-4" />;
    if (amenityLower.includes("breakfast") || amenityLower.includes("meal")) return <Coffee className="h-4 w-4" />;
    if (amenityLower.includes("parking") || amenityLower.includes("car")) return <Car className="h-4 w-4" />;
    if (amenityLower.includes("restaurant") || amenityLower.includes("dining")) return <Utensils className="h-4 w-4" />;
    if (amenityLower.includes("gym") || amenityLower.includes("fitness")) return <Dumbbell className="h-4 w-4" />;
    if (amenityLower.includes("pool") || amenityLower.includes("swimming")) return <Waves className="h-4 w-4" />;
    if (amenityLower.includes("tv") || amenityLower.includes("entertainment")) return <Tv className="h-4 w-4" />;
    if (amenityLower.includes("ac") || amenityLower.includes("air conditioning")) return <Snowflake className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  };

  // Filter and sort hotels
  const filteredAndSortedHotels = useMemo(() => {
    let result = hotels.filter(hotel => {
      const matchesCity = selectedCity === "all" || hotel.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesRating = starRating === 0 || (hotel.star_rating && hotel.star_rating >= starRating);
      const matchesPrice = hotel.price_per_night >= priceRange[0] && hotel.price_per_night <= priceRange[1];
      const matchesSearch = !searchQuery || 
        hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hotel.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hotel.locality.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesRating && matchesPrice && matchesSearch;
    });

    // Sort
    if (sortBy === "price") {
      result.sort((a, b) => a.price_per_night - b.price_per_night);
    } else if (sortBy === "rating") {
      result.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
    } else if (sortBy === "popularity") {
      result.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    }

    return result;
  }, [hotels, selectedCity, starRating, priceRange, searchQuery, sortBy]);

  const handleSearch = () => {
    if (location) {
      setSelectedCity(location);
      navigate(`/hotels?city=${encodeURIComponent(location)}`);
    }
    setShowSuggestions(false);
  };

  const handleHotelClick = (hotel: PartnerHotel) => {
    window.open(`/hotels/${hotel.id}`, "_blank", "noopener,noreferrer");
  };

  const toggleFavorite = (hotelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(hotelId) 
        ? prev.filter(id => id !== hotelId)
        : [...prev, hotelId]
    );
    toast.success(favorites.includes(hotelId) ? "Removed from favorites" : "Added to favorites");
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 pt-20">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <Navigation />
      
      <main className="flex-1 pt-20">
        {/* Hero Section - Modern Search */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          
          <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 max-w-3xl mx-auto"
            >
              <Badge className="inline-flex bg-primary/20 text-primary border-primary/30 px-4 py-2 gap-2">
                <Hotel className="h-4 w-4" />
                <span>100+ Partner Hotels</span>
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Find Your Perfect Stay
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Discover comfortable accommodations near your dream properties with exclusive discounts for JaagaX buyers
              </p>

              {/* Search Bar - Modern Design */}
              <div className="relative bg-card/80 backdrop-blur-sm border rounded-2xl shadow-2xl p-2 mt-8">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                    <Input
                      placeholder="Search by city, hotel name, or locality..."
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pl-12 h-12 border-0 focus-visible:ring-0 focus-visible:ring-transparent"
                    />
                    {showSuggestions && location && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                        {popularLocations
                          .filter(l => l.toLowerCase().includes(location.toLowerCase()))
                          .map((loc) => (
                            <button
                              key={loc}
                              onClick={() => {
                                setLocation(loc);
                                setSelectedCity(loc);
                                setShowSuggestions(false);
                                handleSearch();
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center gap-3"
                            >
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{loc}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {hotels.filter(h => h.city.toLowerCase() === loc.toLowerCase()).length} hotels
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleSearch}
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search Hotels
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Partner CTA Banner */}
        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-primary/10">
          <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Hotel className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                Own a hotel? <span className="font-semibold text-foreground">Partner with us</span> and reach thousands of property buyers
              </span>
            </div>
            <Button 
              variant="premium" 
              size="sm"
              onClick={() => navigate("/partners")}
              className="whitespace-nowrap"
            >
              Partner Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <MyHotelApplicationsBanner />

        {/* Main Content */}
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {/* Packages Section */}
          {packages.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">✨ Visit + Stay Packages</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bundle your stay with property visits and save more
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {packages.length} packages available
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg, index) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                      <CardContent className="p-6 relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                              {pkg.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {pkg.description}
                            </p>
                          </div>
                          <Badge className="bg-primary/10 text-primary border-0">
                            {pkg.duration_days} Days
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {pkg.includes_airport_pickup && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              ✈️ Airport Pickup
                            </Badge>
                          )}
                          {pkg.includes_meals && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              🍽️ Meals Included
                            </Badge>
                          )}
                          {pkg.includes_local_transport && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              🚗 Local Transport
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div>
                            <span className="text-sm text-muted-foreground">Save up to</span>
                            <span className="block text-xl font-bold text-primary">
                              {pkg.base_discount_percentage}%
                            </span>
                          </div>
                          <Button 
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              if (!user) {
                                toast.error("Please sign in as a buyer to book");
                                navigate("/auth");
                                return;
                              }
                              if (role && role !== "buyer") {
                                toast.error("Only buyers can book packages", {
                                  description: `Your account role is "${role}". Please use a buyer account.`,
                                });
                                return;
                              }
                              if (pkg.duration_days >= 2 || /weekend/i.test(pkg.name)) {
                                setWeekendPackage(pkg);
                              } else {
                                setQuickVisitPackage(pkg);
                              }
                            }}
                          >
                            Book Package
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Hotels Section */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">🏨 Partner Hotels</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredAndSortedHotels.length} hotels found in {selectedCity === "all" ? "all cities" : selectedCity}
                </p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="rating">⭐ Top Rated</option>
                  <option value="price">💰 Price: Low to High</option>
                  <option value="popularity">🔥 Most Popular</option>
                </select>

                {/* View Toggle */}
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 px-3 text-sm transition-colors ${
                      viewMode === "grid" 
                        ? "bg-primary text-white" 
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 px-3 text-sm transition-colors ${
                      viewMode === "list" 
                        ? "bg-primary text-white" 
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    List
                  </button>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {showFilters && <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="mb-6 border-primary/10">
                    <CardContent className="p-4 md:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* City Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            City
                          </label>
                          <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="all">All Cities</option>
                            {popularLocations.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>

                        {/* Rating Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            Min Rating
                          </label>
                          <select
                            value={starRating}
                            onChange={(e) => setStarRating(parseInt(e.target.value))}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="0">Any Rating</option>
                            <option value="3">3+ Stars</option>
                            <option value="4">4+ Stars</option>
                            <option value="5">5 Stars</option>
                          </select>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Max Price
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="20000"
                            step="500"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>₹0</span>
                            <span>₹{priceRange[1].toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCity("all");
                              setStarRating(0);
                              setPriceRange([0, 20000]);
                              setSearchQuery("");
                            }}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear All
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setShowFilters(false)}
                            className="flex-1"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hotels Grid/List */}
            {filteredAndSortedHotels.length === 0 ? (
              <div className="text-center py-12">
                <Hotel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hotels found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search for a different city
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSelectedCity("all");
                    setStarRating(0);
                    setPriceRange([0, 20000]);
                    setSearchQuery("");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filteredAndSortedHotels.map((hotel, index) => (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => handleHotelClick(hotel)}
                    className="cursor-pointer"
                  >
                    <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 hover:border-primary/20 ${
                      viewMode === "list" ? "flex flex-col md:flex-row" : ""
                    }`}>
                      {/* Image Section */}
                      <div className={`relative ${
                        viewMode === "list" ? "md:w-72 md:h-48 h-48" : "h-56"
                      } bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden group`}>
                        {hotel.images && hotel.images[0] ? (
                          <img 
                            src={hotel.images[0]} 
                            alt={hotel.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy" 
                            decoding="async" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <Hotel className="h-16 w-16 text-primary/30" />
                          </div>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          {hotel.discount_percentage && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">
                              🔥 {hotel.discount_percentage}% OFF
                            </Badge>
                          )}
                          {hotel.star_rating && hotel.star_rating >= 4 && (
                            <Badge className="bg-amber-400 hover:bg-amber-500 text-black border-0">
                              ⭐ Premium
                            </Badge>
                          )}
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(hotel.id, e)}
                          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                        >
                          <Heart 
                            className={`h-5 w-5 transition-colors ${
                              favorites.includes(hotel.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-muted-foreground hover:text-red-500"
                            }`} 
                          />
                        </button>

                        {/* Quick Actions */}
                        <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="flex-1 bg-white/90 hover:bg-white text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotel(hotel);
                              setShowHotelOnlyModal(true);
                            }}
                          >
                            Quick Book
                          </Button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <CardContent className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                              {hotel.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{hotel.locality}, {hotel.city}</span>
                            </div>
                          </div>
                          {renderStars(hotel.star_rating)}
                        </div>

                        {/* Amenities */}
                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 mb-3">
                            {hotel.amenities.slice(0, 4).map((amenity) => (
                              <Badge 
                                key={amenity} 
                                variant="outline" 
                                className="text-xs bg-primary/5 border-primary/10 flex items-center gap-1"
                              >
                                {getAmenityIcon(amenity)}
                                {amenity}
                              </Badge>
                            ))}
                            {hotel.amenities.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{hotel.amenities.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-primary">
                                ₹{hotel.price_per_night.toLocaleString()}
                              </span>
                              <span className="text-sm text-muted-foreground">/night</span>
                            </div>
                            {hotel.discount_percentage && (
                              <span className="text-xs text-green-600">
                                Save {hotel.discount_percentage}%
                              </span>
                            )}
                          </div>
                          <Button 
                            size="sm"
                            className="rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotel(hotel);
                              setShowHotelOnlyModal(true);
                            }}
                          >
                            Book Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <VisitStayPlanner
        open={showVisitStayModal}
        onClose={() => {
          setShowVisitStayModal(false);
          setPreSelectedPackage(null);
        }}
        propertyId="preview"
        propertyTitle="Hotel Booking"
        propertyCity={selectedHotel?.city || "Hyderabad"}
        propertyLocality={selectedHotel?.locality || ""}
        mode="visit_stay"
        preSelectedHotel={selectedHotel}
        preSelectedPackage={preSelectedPackage}
      />

      {selectedHotel && (
        <HotelOnlyBooking
          open={showHotelOnlyModal}
          onClose={() => {
            setShowHotelOnlyModal(false);
            setSelectedHotel(null);
          }}
          hotel={selectedHotel}
        />
      )}

      <WeekendExplorerWizard
        open={!!weekendPackage}
        onClose={() => setWeekendPackage(null)}
        packageId={weekendPackage?.id}
        packageName={weekendPackage?.name}
        packageDuration={weekendPackage?.duration_days || 2}
        packageDiscount={weekendPackage?.base_discount_percentage || 15}
        defaultCity={selectedCity !== "all" ? selectedCity : "Hyderabad"}
      />

      <QuickVisitWizard
        open={!!quickVisitPackage}
        onClose={() => setQuickVisitPackage(null)}
        propertyCity={selectedCity !== "all" ? selectedCity : "Hyderabad"}
      />
    </div>
  );
};

export default Hotels;