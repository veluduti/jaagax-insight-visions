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
  Heart,
  Sparkles,
  Phone,
  Mail,
  Building2,
  Handshake,
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
  description?: string;
  reviews_count?: number;
  check_in_time?: string;
  check_out_time?: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "all");
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [weekendPackage, setWeekendPackage] = useState<VisitPackage | null>(null);
  const [quickVisitPackage, setQuickVisitPackage] = useState<VisitPackage | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"price" | "rating" | "popularity">("rating");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch hotels and packages
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

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai", "Delhi", "Pune"];

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city && !searchParams.get("city")) {
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === detectedLocation.city.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        setSearchQuery(matchedCity);
      }
    }
  }, [detectedLocation]);

  // Get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes("wifi")) return <Wifi className="h-3.5 w-3.5" />;
    if (amenityLower.includes("breakfast") || amenityLower.includes("meal")) return <Coffee className="h-3.5 w-3.5" />;
    if (amenityLower.includes("parking") || amenityLower.includes("car")) return <Car className="h-3.5 w-3.5" />;
    if (amenityLower.includes("restaurant") || amenityLower.includes("dining"))
      return <Utensils className="h-3.5 w-3.5" />;
    if (amenityLower.includes("gym") || amenityLower.includes("fitness")) return <Dumbbell className="h-3.5 w-3.5" />;
    if (amenityLower.includes("pool") || amenityLower.includes("swimming")) return <Waves className="h-3.5 w-3.5" />;
    if (amenityLower.includes("tv") || amenityLower.includes("entertainment")) return <Tv className="h-3.5 w-3.5" />;
    if (amenityLower.includes("ac") || amenityLower.includes("air conditioning"))
      return <Snowflake className="h-3.5 w-3.5" />;
    return <Sparkles className="h-3.5 w-3.5" />;
  };

  // Filter and sort hotels
  const filteredAndSortedHotels = useMemo(() => {
    let result = hotels.filter((hotel) => {
      const matchesCity = selectedCity === "all" || hotel.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesRating = starRating === 0 || (hotel.star_rating && hotel.star_rating >= starRating);
      const matchesPrice = hotel.price_per_night >= priceRange[0] && hotel.price_per_night <= priceRange[1];
      const matchesSearch =
        !searchQuery ||
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
    if (searchQuery) {
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === searchQuery.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        navigate(`/hotels?city=${encodeURIComponent(matchedCity)}`);
      }
    }
    setShowSuggestions(false);
  };

  const handleHotelClick = (hotel: PartnerHotel) => {
    window.open(`/hotels/${hotel.id}`, "_blank", "noopener,noreferrer");
  };

  const toggleFavorite = (hotelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => (prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]));
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 pt-20">
          <div className="container mx-auto max-w-7xl px-4 py-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse border-0 shadow-sm">
                  <div className="h-48 bg-gray-200" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Hero Section - Green Theme */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Find Hotels</h1>
                <p className="text-green-100 text-sm mt-0.5">
                  {filteredAndSortedHotels.length} hotels available in{" "}
                  {selectedCity === "all" ? "all cities" : selectedCity}
                </p>
              </div>

              {/* Connect with Us Button - Highlighted */}
              <Button
                variant="default"
                size="default"
                onClick={() => navigate("/partners")}
                className="bg-white text-green-700 hover:bg-green-50 hover:text-green-800 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-6 py-2.5 rounded-lg border-2 border-white/20 flex items-center gap-2"
              >
                <Handshake className="h-5 w-5" />
                Connect with Us
                <span className="ml-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full animate-pulse">NEW</span>
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mt-3 bg-white rounded-lg shadow-lg p-1.5 flex flex-col md:flex-row gap-1.5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by city, hotel name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 border-0 focus-visible:ring-0 focus-visible:ring-transparent h-10 text-sm"
                />
                {showSuggestions && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
                    {popularLocations
                      .filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setSearchQuery(loc);
                            setSelectedCity(loc);
                            setShowSuggestions(false);
                            handleSearch();
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
                        >
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{loc}</span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {hotels.filter((h) => h.city.toLowerCase() === loc.toLowerCase()).length} hotels
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700 text-white px-6 h-10 text-sm">
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-4">
          {/* My Hotel Partner Application status */}
          <MyHotelApplicationsBanner />

          {/* Filters and Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-white p-2.5 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 h-8 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {showFilters ? <ChevronDown className="h-3 w-3" /> : null}
              </Button>

              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="text-xs font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-0 bg-transparent focus:outline-none text-xs font-medium text-green-600"
                >
                  <option value="rating">⭐ Top Rated</option>
                  <option value="price">💰 Price: Low to High</option>
                  <option value="popularity">🔥 Most Popular</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1 px-2.5 text-xs transition-colors ${
                    viewMode === "grid" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1 px-2.5 text-xs transition-colors ${
                    viewMode === "list" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  List
                </button>
              </div>
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
                <div className="bg-white p-3 rounded-lg shadow-sm border mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full border rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">All Cities</option>
                        {popularLocations.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Min Rating</label>
                      <select
                        value={starRating}
                        onChange={(e) => setStarRating(parseInt(e.target.value))}
                        className="w-full border rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="0">Any Rating</option>
                        <option value="3">3+ Stars</option>
                        <option value="4">4+ Stars</option>
                        <option value="5">5 Stars</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Max Price</label>
                      <input
                        type="range"
                        min="0"
                        max="20000"
                        step="500"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                        className="w-full mt-1"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                        <span>₹0</span>
                        <span>₹{priceRange[1].toLocaleString()}</span>
                      </div>
                    </div>
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
                        className="flex-1 h-8 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hotels Grid */}
          {filteredAndSortedHotels.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Hotel className="h-14 w-14 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">No hotels found</h3>
              <p className="text-sm text-gray-500">Try adjusting your filters or search for a different city</p>
              <Button
                variant="outline"
                className="mt-3"
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
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              }
            >
              {filteredAndSortedHotels.map((hotel) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="cursor-pointer"
                  onClick={() => handleHotelClick(hotel)}
                >
                  <Card
                    className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm ${
                      viewMode === "list" ? "flex flex-col md:flex-row" : ""
                    }`}
                  >
                    {/* Image */}
                    <div
                      className={`relative ${
                        viewMode === "list" ? "md:w-56 md:h-40 h-48" : "h-48"
                      } bg-gray-100 overflow-hidden`}
                    >
                      {hotel.images && hotel.images[0] ? (
                        <img
                          src={hotel.images[0]}
                          alt={hotel.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Hotel className="h-12 w-12 text-gray-300" />
                        </div>
                      )}

                      {hotel.discount_percentage && (
                        <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 border-0 text-white text-[10px] px-2 py-0.5">
                          {hotel.discount_percentage}% OFF
                        </Badge>
                      )}

                      <button
                        onClick={(e) => toggleFavorite(hotel.id, e)}
                        className="absolute top-2 left-2 p-1 bg-white/90 hover:bg-white rounded-full shadow-md transition-all hover:scale-110"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            favorites.includes(hotel.id) ? "fill-red-500 text-red-500" : "text-gray-500"
                          }`}
                        />
                      </button>

                      {viewMode === "list" && (
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            className="flex-1 bg-white/90 hover:bg-white text-gray-700 text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotel(hotel);
                              setShowHotelOnlyModal(true);
                            }}
                          >
                            Quick Book
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className={`p-3 ${viewMode === "list" ? "flex-1" : ""}`}>
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="font-semibold text-sm line-clamp-1 hover:text-green-600 transition-colors">
                          {hotel.name}
                        </h3>
                        {renderStars(hotel.star_rating)}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">
                          {hotel.locality}, {hotel.city}
                        </span>
                      </div>

                      {hotel.amenities && hotel.amenities.length > 0 && viewMode !== "list" && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {hotel.amenities.slice(0, 3).map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 bg-gray-50 border-gray-200 gap-0.5"
                            >
                              {getAmenityIcon(amenity)}
                              <span className="ml-0.5">{amenity}</span>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {viewMode === "list" && hotel.amenities && hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {hotel.amenities.slice(0, 5).map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 bg-gray-50 border-gray-200 gap-0.5"
                            >
                              {getAmenityIcon(amenity)}
                              <span className="ml-0.5">{amenity}</span>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-green-600">
                              ₹{hotel.price_per_night.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500">/night</span>
                          </div>
                          {hotel.discount_percentage && (
                            <span className="text-[10px] text-green-600">Save {hotel.discount_percentage}%</span>
                          )}
                        </div>
                        {viewMode === "grid" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotel(hotel);
                              setShowHotelOnlyModal(true);
                            }}
                          >
                            Book
                          </Button>
                        )}
                        {viewMode === "list" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotel(hotel);
                              setShowHotelOnlyModal(true);
                            }}
                          >
                            Book Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Hotel Only Booking Modal */}
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

      {/* Weekend Property Explorer Wizard */}
      <WeekendExplorerWizard
        open={!!weekendPackage}
        onClose={() => setWeekendPackage(null)}
        packageId={weekendPackage?.id}
        packageName={weekendPackage?.name}
        packageDuration={weekendPackage?.duration_days || 2}
        packageDiscount={weekendPackage?.base_discount_percentage || 15}
        defaultCity={selectedCity !== "all" ? selectedCity : "Hyderabad"}
      />

      {/* Quick Visit Package Wizard */}
      <QuickVisitWizard
        open={!!quickVisitPackage}
        onClose={() => setQuickVisitPackage(null)}
        propertyCity={selectedCity !== "all" ? selectedCity : "Hyderabad"}
      />
    </div>
  );
};

export default Hotels;
