import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Hotel, MapPin, Loader2, Star, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import HotelCard from "@/components/hotels/HotelCard";
import HotelDetailModal from "@/components/hotels/HotelDetailModal";
import HotelTrustBanner from "@/components/hotels/HotelTrustBanner";
import PackageShowcase from "@/components/hotels/PackageShowcase";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { HotelOnlyBooking } from "@/components/hotels/HotelOnlyBooking";

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
  
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [location, setLocation] = useState(searchParams.get('city') || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter state
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [starRating, setStarRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVisitStayModal, setShowVisitStayModal] = useState(false);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [preSelectedPackage, setPreSelectedPackage] = useState<VisitPackage | null>(null);

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai"];

  useEffect(() => {
    fetchData();
  }, []);

  // Sync URL params
  useEffect(() => {
    const city = searchParams.get('city');
    if (city) {
      setSelectedCity(city);
      setLocation(city);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [hotelsRes, packagesRes] = await Promise.all([
        supabase
          .from('partner_hotels')
          .select('*')
          .eq('is_active', true)
          .order('star_rating', { ascending: false }),
        supabase
          .from('visit_packages')
          .select('*')
          .eq('is_active', true)
          .order('duration_days', { ascending: true })
      ]);

      if (hotelsRes.error) throw hotelsRes.error;
      if (packagesRes.error) throw packagesRes.error;

      setHotels(hotelsRes.data || []);
      setPackages(packagesRes.data || []);

      // Set max price based on data
      if (hotelsRes.data && hotelsRes.data.length > 0) {
        const maxHotelPrice = Math.max(...hotelsRes.data.map(h => h.price_per_night));
        setPriceRange([0, maxHotelPrice]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities for filter
  const cities = useMemo(() => {
    return [...new Set(hotels.map(h => h.city))].sort();
  }, [hotels]);

  // Calculate max price for slider
  const maxPrice = useMemo(() => {
    return hotels.length > 0 ? Math.max(...hotels.map(h => h.price_per_night)) : 20000;
  }, [hotels]);

  // Filter hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesCity = selectedCity === "all" || hotel.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesRating = starRating === 0 || (hotel.star_rating && hotel.star_rating >= starRating);
      const matchesPrice = hotel.price_per_night >= priceRange[0] && hotel.price_per_night <= priceRange[1];
      return matchesCity && matchesRating && matchesPrice;
    });
  }, [hotels, selectedCity, starRating, priceRange]);

  const handleSearch = () => {
    if (location) {
      setSelectedCity(location);
      navigate(`/hotels?city=${encodeURIComponent(location)}`);
    } else {
      setSelectedCity("all");
      navigate('/hotels');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewDetails = (hotel: PartnerHotel) => {
    setSelectedHotel(hotel);
    setShowDetailModal(true);
  };

  const handleBookNow = (hotel: PartnerHotel) => {
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowVisitStayModal(true);
  };

  const handleBookWithVisit = (hotel: PartnerHotel) => {
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowVisitStayModal(true);
  };

  const handleBookHotelOnly = (hotel: PartnerHotel) => {
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowHotelOnlyModal(true);
  };

  const handleSelectPackage = (pkg: VisitPackage) => {
    setPreSelectedPackage(pkg);
    if (filteredHotels.length > 0) {
      setSelectedHotel(filteredHotels[0]);
      setShowVisitStayModal(true);
    } else {
      toast.info('Please select a hotel first');
    }
  };

  const resetFilters = () => {
    setSelectedCity("all");
    setLocation("");
    setStarRating(0);
    setPriceRange([0, maxPrice]);
    navigate('/hotels');
  };

  const activeFiltersCount = [
    selectedCity !== "all" ? 1 : 0,
    starRating > 0 ? 1 : 0,
    priceRange[1] < maxPrice ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container-padding max-w-7xl mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Partner Hotels
            </h1>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <p className="text-muted-foreground">
                {filteredHotels.length > 0 
                  ? `Found ${filteredHotels.length} hotels` 
                  : "Find your perfect stay near properties"}
              </p>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Hotel className="w-3 h-3" />
                Exclusive JaagaX Discounts
              </Badge>
            </div>
            
            {/* Search Card - Similar to PropertySearchBar */}
            <div className="w-full max-w-5xl mx-auto">
              <div className="bg-card/95 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden border border-border/50">
                {/* Search Form */}
                <div className="p-4 space-y-3">
                  {/* Location + Search Row */}
                  <div className="flex gap-2 items-center flex-wrap">
                    {/* Location Input */}
                    <div className="relative flex-1 min-w-[250px]">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/30 focus-within:border-primary/50 transition-colors">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input
                          placeholder="Enter city (e.g., Hyderabad, Vijayawada)"
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-muted-foreground"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setShowSuggestions(e.target.value.length > 0);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          onKeyPress={handleKeyPress}
                        />
                        {location && (
                          <button 
                            onClick={() => {
                              setLocation("");
                              setSelectedCity("all");
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Autocomplete Suggestions */}
                      {showSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-[60] w-full mt-1 bg-popover rounded-lg overflow-hidden border border-border/50 shadow-xl"
                        >
                          {popularLocations
                            .filter((loc) =>
                              loc.toLowerCase().includes(location.toLowerCase())
                            )
                            .map((loc, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setLocation(loc);
                                  setSelectedCity(loc);
                                  setShowSuggestions(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 border-b border-border/30 last:border-0 text-sm"
                              >
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-foreground">{loc}</span>
                              </button>
                            ))}
                          {location && !popularLocations.some(loc => 
                            loc.toLowerCase() === location.toLowerCase()
                          ) && (
                            <button
                              onClick={() => {
                                setSelectedCity(location);
                                setShowSuggestions(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 text-sm"
                            >
                              <MapPin className="h-3 w-3 text-primary" />
                              <span className="text-foreground">Search "{location}"</span>
                            </button>
                          )}
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
                  <div className="flex gap-2 items-center flex-wrap">
                    {/* Star Rating Quick Filters */}
                    {[3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setStarRating(starRating === rating ? 0 : rating)}
                        className={`py-2 px-4 text-sm font-medium rounded-lg transition-all flex items-center gap-1 ${
                          starRating === rating
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        {rating}+ <Star className="h-3 w-3 fill-current" />
                      </button>
                    ))}

                    {/* More Filters Button */}
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="h-10 text-sm bg-background/80 border-border/50 hover:bg-primary/5 hover:border-primary/30 gap-2 transition-all group"
                    >
                      <SlidersHorizontal className="h-4 w-4 group-hover:text-primary transition-colors" />
                      <span>More Filters</span>
                      {activeFiltersCount > 0 && (
                        <Badge className="ml-1 bg-primary/10 text-primary border-primary/30">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>

                    {/* Reset Button */}
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        onClick={resetFilters}
                        className="h-10 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Expanded Filters */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-border/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* City Filter */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">City</label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setSelectedCity("all")}
                                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                                    selectedCity === "all"
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary/50 text-foreground hover:bg-secondary'
                                  }`}
                                >
                                  All Cities
                                </button>
                                {cities.map((city) => (
                                  <button
                                    key={city}
                                    onClick={() => {
                                      setSelectedCity(city);
                                      setLocation(city);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                                      selectedCity === city
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/50 text-foreground hover:bg-secondary'
                                    }`}
                                  >
                                    {city}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Price Range */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                Price Range: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={maxPrice}
                                step={500}
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                className="w-full accent-primary"
                              />
                            </div>

                            {/* Star Rating */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Minimum Rating</label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <button
                                    key={rating}
                                    onClick={() => setStarRating(starRating === rating ? 0 : rating)}
                                    className={`p-2 rounded-md transition-all ${
                                      starRating >= rating
                                        ? 'text-amber-500'
                                        : 'text-muted-foreground/30 hover:text-muted-foreground'
                                    }`}
                                  >
                                    <Star className={`h-5 w-5 ${starRating >= rating ? 'fill-current' : ''}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  <span>Need help finding the right area?</span>
                  <span className="text-primary font-medium">Try AI Advisor →</span>
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* Trust Banner */}
          <HotelTrustBanner />

          {/* Hotels Grid */}
          <div className="mt-8">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            ) : filteredHotels.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="glass-card p-12 max-w-md mx-auto">
                  <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Hotels Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {hotels.length === 0
                      ? "We're onboarding partner hotels. Check back soon!"
                      : "Try adjusting your search criteria"}
                  </p>
                  <Button onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onViewDetails={handleViewDetails}
                    onBookNow={handleBookNow}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Package Showcase */}
          <PackageShowcase
            packages={packages}
            onSelectPackage={handleSelectPackage}
          />
        </div>
      </main>

      <Footer />

      {/* Hotel Detail Modal */}
      <HotelDetailModal
        hotel={selectedHotel}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onBookWithVisit={handleBookWithVisit}
        onBookHotelOnly={handleBookHotelOnly}
      />

      {/* Visit + Stay Booking Modal */}
      {selectedHotel && (
        <VisitStayPlanner
          open={showVisitStayModal}
          onClose={() => {
            setShowVisitStayModal(false);
            setPreSelectedPackage(null);
          }}
          propertyId={0}
          propertyTitle="Hotel Booking"
          propertyCity={selectedHotel.city}
          propertyLocality={selectedHotel.locality}
          mode="visit_stay"
          preSelectedHotel={selectedHotel}
          preSelectedPackage={preSelectedPackage}
        />
      )}

      {/* Hotel Only Booking Modal */}
      {selectedHotel && (
        <HotelOnlyBooking
          open={showHotelOnlyModal}
          onClose={() => setShowHotelOnlyModal(false)}
          hotel={selectedHotel}
        />
      )}
    </div>
  );
};

export default Hotels;
