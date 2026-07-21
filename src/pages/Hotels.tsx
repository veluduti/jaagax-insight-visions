import { useState, useMemo, useEffect, useRef } from "react";
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
  Handshake,
  Trophy,
  TrendingUp,
  Shield,
  Building2,
  Clock,
  TrendingUp as TrendingUpIcon,
  Calendar,
  Users,
  Home,
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
import { resolveHotelImages } from "@/lib/hotelImage";
import { format } from "date-fns";

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

interface SearchSuggestion {
  type: "city" | "hotel" | "locality" | "popular";
  name: string;
  subtitle?: string;
  count?: number;
  icon?: React.ReactNode;
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
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // New search states for advanced search
  const [checkIn, setCheckIn] = useState<Date>(new Date());
  const [checkOut, setCheckOut] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai", "Delhi", "Pune"];
  const popularHotels = ["Taj", "ITC", "Marriott", "Hilton", "Radisson"];

  // Fetch approved + active hotels that have at least one active room; compute
  // "starts from" price from the cheapest active room (not the legacy field).
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hotelsRes, roomsRes, packagesRes] = await Promise.all([
          supabase.from("partner_hotels").select("*").eq("is_active", true).order("star_rating", { ascending: false }),
          supabase.from("hotel_rooms").select("hotel_id, base_price, is_active").eq("is_active", true),
          supabase.from("visit_packages").select("*").eq("is_active", true),
        ]);

        const minByHotel = new Map<string, number>();
        (roomsRes.data || []).forEach((r: any) => {
          const cur = minByHotel.get(r.hotel_id);
          const p = Number(r.base_price) || 0;
          if (p <= 0) return;
          if (cur === undefined || p < cur) minByHotel.set(r.hotel_id, p);
        });

        const enriched = await Promise.all(
          (hotelsRes.data || [])
            .filter((h: any) => minByHotel.has(h.id))
            .map(async (h: any) => ({
              ...h,
              price_per_night: minByHotel.get(h.id) as number,
              images: await resolveHotelImages(h.images),
            })),
        );

        setHotels(enriched);
        if (packagesRes.data) setPackages(packagesRes.data);
      } catch (err) {
        console.error("Error fetching hotels:", err);
        setHotels([]);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get suggestions based on search query - Real-world hotel search behavior
  useEffect(() => {
    if (searchQuery.length === 0) {
      // Show popular suggestions when empty
      const popularSuggestions: SearchSuggestion[] = [
        { type: "popular", name: "Popular Cities", subtitle: "Trending destinations" },
        ...popularLocations.slice(0, 3).map((city) => ({
          type: "city" as const,
          name: city,
          count: hotels.filter((h) => h.city.toLowerCase() === city.toLowerCase()).length,
        })),
        { type: "popular", name: "Popular Hotels", subtitle: "Most booked properties" },
        ...popularHotels.slice(0, 3).map((hotel) => ({
          type: "hotel" as const,
          name: hotel,
          subtitle: "Popular chain",
        })),
      ];
      setSuggestions(popularSuggestions);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    setIsSearching(true);

    const newSuggestions: SearchSuggestion[] = [];

    // 1. City suggestions (exact match priority)
    const cityMatches = popularLocations.filter((city) => city.toLowerCase().includes(query));
    cityMatches.forEach((city) => {
      const count = hotels.filter((h) => h.city.toLowerCase() === city.toLowerCase()).length;
      newSuggestions.push({
        type: "city",
        name: city,
        count,
        subtitle: `${count} hotels available`,
      });
    });

    // 2. Hotel name suggestions
    const hotelMatches = hotels.filter(
      (hotel) => hotel.name.toLowerCase().includes(query) || hotel.locality.toLowerCase().includes(query),
    );

    // Remove duplicates and limit
    const uniqueHotelMatches = hotelMatches.filter(
      (hotel, index, self) => index === self.findIndex((h) => h.name === hotel.name),
    );
    uniqueHotelMatches.slice(0, 5).forEach((hotel) => {
      newSuggestions.push({
        type: "hotel",
        name: hotel.name,
        subtitle: `${hotel.locality}, ${hotel.city}`,
        count: 1,
      });
    });

    // 3. Locality suggestions
    const localityMatches = hotels.filter(
      (hotel) => hotel.locality.toLowerCase().includes(query) && !hotel.name.toLowerCase().includes(query),
    );
    localityMatches.slice(0, 3).forEach((hotel) => {
      newSuggestions.push({
        type: "locality",
        name: hotel.locality,
        subtitle: `${hotel.city}`,
        count: hotels.filter((h) => h.locality.toLowerCase() === hotel.locality.toLowerCase()).length,
      });
    });

    // Limit total suggestions
    setSuggestions(newSuggestions.slice(0, 12));
    setIsSearching(false);
  }, [searchQuery, hotels]);

  // Get amenity icon with colors
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes("wifi")) return <Wifi className="h-3.5 w-3.5 text-blue-500" />;
    if (amenityLower.includes("breakfast") || amenityLower.includes("meal"))
      return <Coffee className="h-3.5 w-3.5 text-amber-600" />;
    if (amenityLower.includes("parking") || amenityLower.includes("car"))
      return <Car className="h-3.5 w-3.5 text-purple-500" />;
    if (amenityLower.includes("restaurant") || amenityLower.includes("dining"))
      return <Utensils className="h-3.5 w-3.5 text-red-500" />;
    if (amenityLower.includes("gym") || amenityLower.includes("fitness"))
      return <Dumbbell className="h-3.5 w-3.5 text-orange-500" />;
    if (amenityLower.includes("pool") || amenityLower.includes("swimming"))
      return <Waves className="h-3.5 w-3.5 text-cyan-500" />;
    if (amenityLower.includes("tv") || amenityLower.includes("entertainment"))
      return <Tv className="h-3.5 w-3.5 text-indigo-500" />;
    if (amenityLower.includes("ac") || amenityLower.includes("air conditioning"))
      return <Snowflake className="h-3.5 w-3.5 text-blue-400" />;
    return <Sparkles className="h-3.5 w-3.5 text-yellow-500" />;
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
    if (searchQuery.trim()) {
      // Check if it's a city
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === searchQuery.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        navigate(`/hotels?city=${encodeURIComponent(matchedCity)}`);
      } else {
        // Search by hotel name or locality
        const matchedHotel = hotels.find(
          (h) =>
            h.name.toLowerCase() === searchQuery.toLowerCase() ||
            h.locality.toLowerCase() === searchQuery.toLowerCase(),
        );
        if (matchedHotel) {
          // Filter hotels by the search query
          // The filter will handle it via the matchesSearch condition
        }
      }
    }
    setShowSuggestions(false);
  };

  // Advanced search handler
  const handleAdvancedSearch = () => {
    if (searchQuery.trim()) {
      // Check if it's a city
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === searchQuery.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        navigate(`/hotels?city=${encodeURIComponent(matchedCity)}`);
      } else {
        // Apply filter by search query
        // The filter will handle it via the matchesSearch condition
        navigate(`/hotels?search=${encodeURIComponent(searchQuery)}`);
      }
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "city") {
      setSelectedCity(suggestion.name);
      setSearchQuery(suggestion.name);
      navigate(`/hotels?city=${encodeURIComponent(suggestion.name)}`);
    } else if (suggestion.type === "hotel" || suggestion.type === "locality") {
      setSearchQuery(suggestion.name);
      // Focus on the search input after selecting
      if (inputRef.current) {
        inputRef.current.focus();
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

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "city":
        return <MapPin className="h-4 w-4 text-green-600" />;
      case "hotel":
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case "locality":
        return <MapPin className="h-4 w-4 text-purple-600" />;
      case "popular":
        return <TrendingUpIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSuggestionBgColor = (type: string) => {
    switch (type) {
      case "city":
        return "bg-green-50";
      case "hotel":
        return "bg-blue-50";
      case "locality":
        return "bg-purple-50";
      case "popular":
        return "bg-orange-50";
      default:
        return "bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 pt-2">
          <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse border-0 shadow-sm">
                  <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300" />
                  <CardContent className="p-3 space-y-2">
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <main className="flex-1 pt-2">
        {/* Hero Section with Advanced Search */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />

          <div className="container mx-auto max-w-7xl px-4 py-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-white/20 text-white border-0 text-xs px-3 py-1">
                    <Trophy className="h-3 w-3 mr-1" />
                    Premium Partner Hotels
                  </Badge>
                  <Badge className="bg-yellow-400/20 text-yellow-200 border-0 text-xs px-3 py-1">
                    <Users className="h-3 w-3 mr-1" />
                    Upto 4 Rooms
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  Find Your Perfect Stay
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </h1>
                <p className="text-green-100 text-sm">
                  {filteredAndSortedHotels.length} hotels available{" "}
                  {selectedCity !== "all" ? `in ${selectedCity}` : "in all cities"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="default"
                  onClick={() => navigate("/partners")}
                  className="group bg-white text-green-700 hover:bg-green-50 hover:text-green-800 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold px-5 py-2.5 rounded-xl border-2 border-white/30 flex items-center gap-2 relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Handshake className="h-4 w-4 relative z-10" />
                  <span className="relative z-10">Connect with Us</span>
                  <span className="relative z-10 ml-1 text-[10px] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                    NEW
                  </span>
                </Button>
              </div>
            </div>

            {/* Advanced Search Bar */}
            <div className="mt-4 bg-white rounded-2xl shadow-2xl p-4 relative z-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Location */}
                <div className="relative">
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <MapPin className="h-3 w-3 inline mr-1 text-gray-600" />
                    City, Property Name Or Location
                  </label>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      placeholder="Search city or hotel..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyPress={(e) => e.key === "Enter" && handleAdvancedSearch()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent h-10"
                    />
                    {/* Suggestions dropdown */}
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border z-[100] max-h-60 overflow-y-auto">
                        {isSearching ? (
                          <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
                            Searching...
                          </div>
                        ) : suggestions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No results found for "{searchQuery}"</div>
                        ) : (
                          suggestions.map((suggestion, index) => (
                            <button
                              key={`${suggestion.type}-${suggestion.name}-${index}`}
                              onClick={() => {
                                setSearchQuery(suggestion.name);
                                setShowSuggestions(false);
                                if (suggestion.type === "city") {
                                  setSelectedCity(suggestion.name);
                                  navigate(`/hotels?city=${encodeURIComponent(suggestion.name)}`);
                                }
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 border-b last:border-b-0"
                            >
                              <div
                                className={`p-1.5 ${getSuggestionBgColor(suggestion.type)} rounded-full flex-shrink-0`}
                              >
                                {getSuggestionIcon(suggestion.type)}
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{suggestion.name}</span>
                                {suggestion.subtitle && <p className="text-xs text-gray-500">{suggestion.subtitle}</p>}
                                {suggestion.count !== undefined && suggestion.count > 0 && (
                                  <span className="text-xs text-green-600">
                                    {suggestion.count} {suggestion.count === 1 ? "hotel" : "hotels"}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-in */}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <Calendar className="h-3 w-3 inline mr-1 text-gray-600" />
                    Check-In
                  </label>
                  <Input
                    type="date"
                    value={format(checkIn, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      if (date) setCheckIn(date);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent h-10"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>

                {/* Check-out */}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <Calendar className="h-3 w-3 inline mr-1 text-gray-600" />
                    Check-Out
                  </label>
                  <Input
                    type="date"
                    value={format(checkOut, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      if (date) setCheckOut(date);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent h-10"
                    min={format(checkIn, "yyyy-MM-dd")}
                  />
                </div>

                {/* Rooms & Guests */}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <Users className="h-3 w-3 inline mr-1 text-gray-600" />
                    Rooms & Guests
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={rooms}
                      onChange={(e) => setRooms(parseInt(e.target.value))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 h-10"
                    >
                      {[1, 2, 3, 4].map((num) => (
                        <option key={num} value={num}>
                          {num} Room{num > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 h-10"
                    >
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <option key={num} value={num}>
                          {num} Adult{num > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price Per Night & Search */}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <Home className="h-3 w-3 inline mr-1 text-gray-600" />
                    Price Per Night
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedPriceRange}
                      onChange={(e) => setSelectedPriceRange(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 h-10"
                    >
                      <option value="all">All Prices</option>
                      <option value="0-1500">₹0-₹1500</option>
                      <option value="1500-2500">₹1500-₹2500</option>
                      <option value="2500-5000">₹2500-₹5000</option>
                      <option value="5000-10000">₹5000-₹10000</option>
                      <option value="10000+">₹10000+</option>
                    </select>
                    <Button
                      onClick={handleAdvancedSearch}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 h-10 shadow-md hover:shadow-lg transition-all flex-shrink-0"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </div>

              {/* Last Search & Quick Links */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Last Search:</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {searchQuery || "Not set"}
                  </span>
                  {checkIn && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(checkIn, "dd MMM' yy")} - {checkOut && format(checkOut, "dd MMM' yy")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-700 border-gray-300">
                    Group Deals
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                    NEW
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick booking banner */}
            <div className="mt-3 text-center">
              <p className="text-green-100 text-xs">
                Book Domestic and International Property Online.
                <button
                  onClick={() => navigate("/partners")}
                  className="underline font-medium hover:text-white transition-colors ml-1"
                >
                  To list your property Click Here
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-4">
          <MyHotelApplicationsBanner />

          {/* Quick Stats */}
          {filteredAndSortedHotels.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Hotel className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{filteredAndSortedHotels.length}</p>
                  <p className="text-[10px] text-gray-500">Total Hotels</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {filteredAndSortedHotels.length > 0
                      ? Math.round(
                          filteredAndSortedHotels.reduce((acc, h) => acc + (h.star_rating || 0), 0) /
                            filteredAndSortedHotels.length,
                        )
                      : 0}
                  </p>
                  <p className="text-[10px] text-gray-500">Avg Rating</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {filteredAndSortedHotels.filter((h) => h.discount_percentage).length}
                  </p>
                  <p className="text-[10px] text-gray-500">With Offers</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">100%</p>
                  <p className="text-[10px] text-gray-500">Verified</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 h-8 text-xs border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {showFilters ? <ChevronDown className="h-3 w-3" /> : null}
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-xs font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-0 bg-transparent focus:outline-none text-xs font-medium text-green-600 cursor-pointer"
                >
                  <option value="rating">⭐ Top Rated</option>
                  <option value="price">💰 Price: Low to High</option>
                  <option value="popularity">🔥 Most Popular</option>
                </select>
              </div>

              {selectedCity !== "all" && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                >
                  {selectedCity}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setSelectedCity("all");
                      setSearchQuery("");
                    }}
                  />
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 px-3 text-xs transition-all ${
                    viewMode === "grid"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 px-3 text-xs transition-all ${
                    viewMode === "list"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1.5">📍 City</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      <label className="text-xs font-medium text-gray-600 block mb-1.5">⭐ Min Rating</label>
                      <select
                        value={starRating}
                        onChange={(e) => setStarRating(parseInt(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="0">Any Rating</option>
                        <option value="3">3+ Stars</option>
                        <option value="4">4+ Stars</option>
                        <option value="5">5 Stars</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1.5">💰 Max Price</label>
                      <input
                        type="range"
                        min="0"
                        max="20000"
                        step="500"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                        className="w-full mt-1 accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                        <span>₹0</span>
                        <span className="font-medium text-green-600">₹{priceRange[1].toLocaleString()}</span>
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
                        className="flex-1 h-9 text-xs border-gray-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="flex-1 h-9 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hotels Grid */}
          {filteredAndSortedHotels.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hotel className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No hotels found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : "We couldn't find any hotels matching your criteria."}
                Try adjusting your filters or search for a different city.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-green-200 text-green-600 hover:bg-green-50"
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
              {filteredAndSortedHotels.map((hotel, index) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="cursor-pointer h-full"
                  onClick={() => handleHotelClick(hotel)}
                >
                  <Card
                    className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-md rounded-2xl h-full flex flex-col ${
                      viewMode === "list" ? "flex-row" : ""
                    }`}
                  >
                    {/* Image Section */}
                    <div
                      className={`relative flex-shrink-0 ${
                        viewMode === "list" ? "w-52 h-52" : "h-52 w-full"
                      } bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden`}
                    >
                      {hotel.images && hotel.images[0] ? (
                        <img
                          src={hotel.images[0]}
                          alt={hotel.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100">
                          <Hotel className="h-16 w-16 text-green-300" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                        {hotel.discount_percentage && (
                          <Badge className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-0 text-white text-[10px] px-2.5 py-1 shadow-lg">
                            🔥 {hotel.discount_percentage}% OFF
                          </Badge>
                        )}
                        {hotel.star_rating && hotel.star_rating >= 4.5 && (
                          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-400 text-black border-0 text-[10px] px-2.5 py-1 shadow-lg">
                            ⭐ Premium
                          </Badge>
                        )}
                      </div>

                      <button
                        onClick={(e) => toggleFavorite(hotel.id, e)}
                        className="absolute top-2 left-2 p-1.5 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            favorites.includes(hotel.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-500 hover:text-red-500"
                          }`}
                        />
                      </button>

                      {viewMode === "list" && (
                        <div className="absolute bottom-3 left-3 right-3 flex gap-1.5">
                          <Button
                            size="sm"
                            className="flex-1 bg-white/95 backdrop-blur-sm hover:bg-white text-gray-700 text-xs h-8 rounded-xl shadow-lg"
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
                    <CardContent
                      className={`p-3.5 flex-1 flex flex-col ${viewMode === "list" ? "justify-between" : ""}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-sm line-clamp-1 hover:text-green-600 transition-colors">
                            {hotel.name}
                          </h3>
                          {renderStars(hotel.star_rating)}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-green-500" />
                          <span className="line-clamp-1">
                            {hotel.locality}, {hotel.city}
                          </span>
                        </div>

                        {hotel.amenities && hotel.amenities.length > 0 && viewMode !== "list" && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {hotel.amenities.slice(0, 3).map((amenity) => (
                              <Badge
                                key={amenity}
                                variant="outline"
                                className="text-[9px] px-2 py-0.5 bg-gray-50 border-gray-200 gap-1 rounded-full"
                              >
                                {getAmenityIcon(amenity)}
                                <span className="ml-0.5 truncate max-w-[60px]">{amenity}</span>
                              </Badge>
                            ))}
                            {hotel.amenities.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-2 py-0.5 bg-gray-50 border-gray-200 rounded-full"
                              >
                                +{hotel.amenities.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {viewMode === "list" && hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {hotel.amenities.slice(0, 5).map((amenity) => (
                              <Badge
                                key={amenity}
                                variant="outline"
                                className="text-[9px] px-2 py-0.5 bg-gray-50 border-gray-200 gap-1 rounded-full"
                              >
                                {getAmenityIcon(amenity)}
                                <span className="ml-0.5 truncate max-w-[60px]">{amenity}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-auto">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] text-gray-500">Starts from</span>
                            <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              ₹{hotel.price_per_night.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500">/night</span>
                          </div>
                          {hotel.discount_percentage && (
                            <span className="text-[10px] text-green-600 font-medium">
                              Save {hotel.discount_percentage}%
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs h-8 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotel(hotel);
                            setShowHotelOnlyModal(true);
                          }}
                        >
                          {viewMode === "list" ? "Book Now" : "Book"}
                        </Button>
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
