import { customerView, businessTypeForKind } from "@/config/accommodationTypes";
import { longStayQuote } from "@/lib/longStayPricing";
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
  X,
  ChevronDown,
  Heart,
  Sparkles,
  Handshake,
  Trophy,
  TrendingUp,
  Shield,
  Building2,
  TrendingUp as TrendingUpIcon,
  Calendar,
  Users,
  Plus,
  Minus,
  User,
  UserPlus,
  Baby,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { HotelOnlyBooking } from "@/components/hotels/HotelOnlyBooking";
import StayListingDetail, { type StayListing } from "@/components/hotels/StayListingDetail";
import { WeekendExplorerWizard } from "@/components/booking/WeekendExplorerWizard";
import { QuickVisitWizard } from "@/components/booking/QuickVisitWizard";
import MyHotelApplicationsBanner from "@/components/hotels/MyHotelApplicationsBanner";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CHECKOUT_AFTER_CHECKIN_MSG } from "@/lib/dateRange";
import { resolveHotelImages } from "@/lib/hotelImage";
import { buildRoomCombinations, roomFitsAlone, toOccupancyRoom, type OccupancyRoom } from "@/lib/roomOccupancy";
import { format } from "date-fns";
import StayFinder, { type StayFilters, type AiIntent } from "@/components/hotels/StayFinder";
import { matchStayRequest, type Match } from "@/services/hospitality/matchingService";
import { logHotelSignal, loadStayProfile, type StayProfile } from "@/services/hotelSignals";
import { normalizeCategory, PREF_TO_UNIT } from "@/config/hospitalityCategories";
import {
  buildLocationIndex,
  findCities,
  findLocalities,
  sameLocality,
  withPopularAreas,
} from "@/lib/locationAutocomplete";
import { POPULAR_AREAS } from "@/config/popularAreas";
import { isSameCity } from "@/lib/cityNormalizer";
import hotelBanner from "@/assets/stays-reference-hero.jpg";
import StayDatePicker from "@/components/hotels/StayDatePicker";
import HotelDiscoveryMap, { type HotelMapBounds } from "@/components/hotels/HotelDiscoveryMap";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StayCategoryTabs, StayIntentStrip, HotelDiscoveryFilters } from "@/components/hotels/HotelDiscoveryControls";
import HotelResultRow from "@/components/hotels/HotelResultRow";
import { distanceFromCityCentre, hasFreeCancellation, hasBreakfast } from "@/lib/hotelDiscoveryMeta";
import { List, LayoutGrid } from "lucide-react";

interface RoomFeature {
  kind: string;
  text: string;
}

const KIND_LABEL: Record<string, string> = {
  villa: "Villa",
  cottage: "Cottage",
  tent: "Tent",
  cabin: "Cabin",
  apartment: "Apartment",
  dorm: "Dorm bed",
  private_room: "Private room",
  shared_room: "Shared room",
  entire_home: "Entire home",
  room: "Room",
};
const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wi-Fi",
  breakfast: "Breakfast",
  parking: "Parking",
  pool: "Pool",
  pet_friendly: "Pet-friendly",
  ac: "AC",
  gym: "Gym",
  restaurant: "Restaurant",
  kitchen: "Kitchen",
  laundry: "Laundry",
};

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
  business_types?: string[] | null;
  tags?: string[] | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  type: "city" | "hotel" | "locality" | "popular" | "recent";
  name: string;
  city?: string;
  subtitle?: string;
  count?: number;
  icon?: React.ReactNode;
  date?: string;
  guests?: string;
}

interface ChildAge {
  id: number;
  age: string;
}

const Hotels = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listParam = (k: string) => (searchParams.get(k) || "").split(",").filter(Boolean);
  const stayFilters: StayFilters = {
    types: listParam("types"),
    prefs: listParam("prefs"),
    amenities: listParam("amen"),
    maxPrice: Number(searchParams.get("maxp")) || null,
  };
  // AI-only criteria: accommodation kinds (e.g. villa) and "preferably" amenities.
  const aiKinds = listParam("kinds");
  const aiOptional = listParam("opt");
  const setStayFilters = (f: StayFilters, extra?: { kinds: string[]; opt: string[] }) => {
    const next = new URLSearchParams(searchParams);
    const put = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
    put("types", f.types.join(","));
    put("prefs", f.prefs.join(","));
    put("amen", f.amenities.join(","));
    put("maxp", f.maxPrice ? String(f.maxPrice) : "");
    if (extra) {
      put("kinds", extra.kinds.join(","));
      put("opt", extra.opt.join(","));
    }
    setSearchParams(next, { replace: true });
  };
  const [unitsByHotel, setUnitsByHotel] = useState<Record<string, Set<string>>>({});
  const [roomFeatures, setRoomFeatures] = useState<Record<string, RoomFeature[]>>({});
  const [rawRooms, setRawRooms] = useState<any[]>([]);
  const [reviewMeta, setReviewMeta] = useState<Record<string, { count: number; total: number }>>({});
  const [openListing, setOpenListing] = useState<StayListing | null>(null);
  const [bookRoomIds, setBookRoomIds] = useState<string[] | undefined>(undefined);
  const [profile, setProfile] = useState<StayProfile | null>(null);
  useEffect(() => {
    loadStayProfile()
      .then(setProfile)
      .catch(() => null);
  }, []);
  const { detectedLocation } = useLocation();
  const { user, role } = useAuth();

  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [roomsByHotel, setRoomsByHotel] = useState<Record<string, OccupancyRoom[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("city") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "all");
  const [selectedLocality, setSelectedLocality] = useState<string | null>(searchParams.get("locality"));
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [weekendPackage, setWeekendPackage] = useState<VisitPackage | null>(null);
  const [quickVisitPackage, setQuickVisitPackage] = useState<VisitPackage | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("jaaga_saved_hotels") || "[]"); } catch { return []; } });
  useEffect(() => { localStorage.setItem("jaaga_saved_hotels", JSON.stringify(favorites)); }, [favorites]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // New search states for advanced search — initialized from URL params so a
  // homepage search lands here with dates and guests already applied.
  const parseDateParam = (key: string): Date | null => {
    const raw = searchParams.get(key);
    if (!raw) return null;
    const d = new Date(`${raw}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };
  const parseCountParam = (key: string, min: number, max: number): number | null => {
    const n = Number(searchParams.get(key));
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
  };
  const [checkIn, setCheckIn] = useState<Date>(() => parseDateParam("checkin") ?? new Date());
  const [checkOut, setCheckOut] = useState<Date>(() => {
    const inDate = parseDateParam("checkin") ?? new Date();
    const fromUrl = parseDateParam("checkout");
    if (fromUrl && fromUrl.getTime() > inDate.getTime()) return fromUrl;
    const date = new Date(inDate);
    date.setDate(date.getDate() + 1);
    return date;
  });
  const [rooms, setRooms] = useState(() => parseCountParam("rooms", 1, 4) ?? 1);
  const [adults, setAdults] = useState(() => parseCountParam("adults", 1, 10) ?? parseCountParam("guests", 1, 10) ?? 2);
  const [children, setChildren] = useState(() => parseCountParam("children", 0, 6) ?? 0);
  const [childAges, setChildAges] = useState<ChildAge[]>([]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [resultSort, setResultSort] = useState("recommended");
  const [gridView, setGridView] = useState(true);
  const [mapView, setMapView] = useState(false);
  const [desktopMapVisible, setDesktopMapVisible] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<HotelMapBounds | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [showChildAgeSelector, setShowChildAgeSelector] = useState(false);
  const [searchSubmitToken, setSearchSubmitToken] = useState(0);
  const guestSelectorRef = useRef<HTMLDivElement>(null);

  // Temporary states for guest selector
  const [tempRooms, setTempRooms] = useState(1);
  const [tempAdults, setTempAdults] = useState(2);
  const [tempChildren, setTempChildren] = useState(0);
  const [tempChildAges, setTempChildAges] = useState<ChildAge[]>([]);

  // Recent searches
  const [recentSearches] = useState<SearchSuggestion[]>([
    { type: "recent", name: "Goa", date: "22 Jul - 23 Jul", guests: "2 Guests | 1 Room" },
    { type: "recent", name: "Goa", date: "30 Jun - 01 Jul", guests: "2 Guests | 1 Room" },
  ]);

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai", "Delhi", "Pune"];
  const popularHotels = ["Taj", "ITC", "Marriott", "Hilton", "Radisson"];
  // Generic City → Locality index built from live hotel data (works for any city)
  const locationIndex = useMemo(() => withPopularAreas(buildLocationIndex(hotels), POPULAR_AREAS), [hotels]);

  // Age options for children
  const ageOptions = [
    "Select",
    "Under 1",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
  ];

  // Click outside handler for guest selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guestSelectorRef.current && !guestSelectorRef.current.contains(event.target as Node)) {
        setShowGuestSelector(false);
        setShowChildAgeSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Click outside handler for suggestions - IMPROVED
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update child ages when children count changes
  useEffect(() => {
    const currentAges = childAges.map((a) => a.id);
    const newAges: ChildAge[] = [];

    for (let i = 0; i < children; i++) {
      const existing = childAges.find((a) => a.id === i);
      if (existing) {
        newAges.push(existing);
      } else {
        newAges.push({ id: i, age: "Select" });
      }
    }

    setChildAges(newAges);
  }, [children]);

  // Update temp child ages when temp children count changes
  useEffect(() => {
    const currentAges = tempChildAges.map((a) => a.id);
    const newAges: ChildAge[] = [];

    for (let i = 0; i < tempChildren; i++) {
      const existing = tempChildAges.find((a) => a.id === i);
      if (existing) {
        newAges.push(existing);
      } else {
        newAges.push({ id: i, age: "Select" });
      }
    }

    setTempChildAges(newAges);
  }, [tempChildren]);

  // Fetch approved + active hotels that have at least one active room; compute
  // "starts from" price from the cheapest active room (not the legacy field).
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hotelsRes, roomsRes, packagesRes, reviewsRes] = await Promise.all([
          supabase.from("partner_hotels").select("*").eq("is_active", true).order("star_rating", { ascending: false }),
          supabase
            .from("hotel_rooms")
            .select(
              "id, hotel_id, room_type, base_price, max_occupancy, max_adults, max_children, total_units, is_active, stay_unit, accommodation_kind, attributes, amenities, room_name, description, photos, weekly_price, monthly_price, cancellation_policy",
            )
            .eq("is_active", true),
          supabase.from("visit_packages").select("*").eq("is_active", true),
          supabase.from("hotel_reviews").select("hotel_id, rating").gte("rating", 1).lte("rating", 5),
        ]);

        const minByHotel = new Map<string, number>();
        const occByHotel: Record<string, OccupancyRoom[]> = {};
        const units: Record<string, Set<string>> = {};
        const feats: Record<string, RoomFeature[]> = {};
        (roomsRes.data || []).forEach((r: any) => {
          (units[r.hotel_id] ||= new Set()).add(r.stay_unit || "room");
          (feats[r.hotel_id] ||= []).push({
            kind: r.accommodation_kind || "room",
            text: JSON.stringify([r.room_type, r.amenities, r.attributes]).toLowerCase(),
          });
          const cur = minByHotel.get(r.hotel_id);
          // Long-stay rooms (PG/Hostel/Co-living) may only have weekly/monthly rent.
          const p =
            Number(r.base_price) ||
            Math.round(Number(r.monthly_price) / 30) ||
            Math.round(Number(r.weekly_price) / 7) ||
            0;
          (occByHotel[r.hotel_id] ||= []).push(
            toOccupancyRoom(
              { ...r, room_type: r.room_type || "Room" },
              { available: Number(r.total_units) || 1, perNight: p },
            ),
          );
          if (p <= 0) return;
          if (cur === undefined || p < cur) minByHotel.set(r.hotel_id, p);
        });
        setRoomsByHotel(occByHotel);
        setUnitsByHotel(units);
        setRoomFeatures(feats);
        setRawRooms(roomsRes.data || []);

        const reviewAgg: Record<string, { count: number; total: number }> = {};
        (reviewsRes.data || []).forEach((r: any) => {
          if (!r?.hotel_id) return;
          const cur = reviewAgg[r.hotel_id] || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += Number(r.rating) || 0;
          reviewAgg[r.hotel_id] = cur;
        });
        setReviewMeta(reviewAgg);

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

  // Get suggestions based on search query - IMPROVED to match image 1 style
  useEffect(() => {
    if (searchQuery.length === 0) {
      // Show recent searches and popular suggestions when empty
      const emptySuggestions: SearchSuggestion[] = [
        ...recentSearches.map((recent) => ({
          ...recent,
          type: "recent" as const,
        })),
        { type: "popular", name: "SUGGESTIONS", subtitle: "" },
        ...popularLocations.slice(0, 3).map((city) => ({
          type: "city" as const,
          name: city,
          count: hotels.filter((h) => h.city.toLowerCase() === city.toLowerCase()).length,
        })),
      ];
      setSuggestions(emptySuggestions);
      return;
    }

    // If the field shows a chosen "Area, City" label, search by the area part
    const query = searchQuery.toLowerCase().trim().split(",")[0].trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const cityItems: SearchSuggestion[] = [];
    const areaItems: SearchSuggestion[] = [];
    const hotelItems: SearchSuggestion[] = [];
    const areaSeen = new Set<string>();
    const pushArea = (cityName: string, loc: { name: string; count: number }) => {
      const k = `${cityName}|${loc.name.toLowerCase()}`;
      if (areaSeen.has(k)) return;
      areaSeen.add(k);
      areaItems.push({ type: "locality", name: loc.name, city: cityName, subtitle: cityName, count: loc.count });
    };

    // 1. Areas matching the text directly (e.g. "madha" → Madhapur, Hyderabad)
    findLocalities(locationIndex, query, 6).forEach(({ city, locality }) => pushArea(city.name, locality));

    // 2. Cities (alias + fuzzy) and their popular areas
    const cityMatches = findCities(locationIndex, query, 3);
    cityMatches.forEach(({ city }, i) => {
      cityItems.push({
        type: "city",
        name: city.name,
        count: city.count,
        subtitle: city.count ? `All hotels in ${city.name}` : `Search all of ${city.name}`,
      });
      if (i === 0) city.localities.slice(0, 10).forEach((loc) => pushArea(city.name, loc));
    });

    // 3. Nothing close? Offer looser "did you mean" area matches
    if (!cityItems.length && !areaItems.length) {
      findLocalities(locationIndex, query, 5, 15).forEach(({ city, locality }) => pushArea(city.name, locality));
    }

    // 4. Hotel names
    hotels
      .filter((hotel) => hotel.name.toLowerCase().includes(query))
      .filter((hotel, index, self) => index === self.findIndex((h) => h.name === hotel.name))
      .slice(0, 4)
      .forEach((hotel) =>
        hotelItems.push({ type: "hotel", name: hotel.name, subtitle: `${hotel.locality}, ${hotel.city}`, count: 1 }),
      );

    const grouped: SearchSuggestion[] = [];
    if (cityItems.length) grouped.push({ type: "popular", name: "Cities" }, ...cityItems);
    if (areaItems.length) grouped.push({ type: "popular", name: "Popular Areas" }, ...areaItems.slice(0, 10));
    if (hotelItems.length) grouped.push({ type: "popular", name: "Hotels" }, ...hotelItems);
    setSuggestions(grouped);
    setIsSearching(false);
  }, [searchQuery, hotels, recentSearches, locationIndex]);

  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const selectableIdx = useMemo(
    () => suggestions.map((s, i) => (s.type === "popular" ? -1 : i)).filter((i) => i >= 0),
    [suggestions],
  );
  useEffect(() => setActiveSuggestion(-1), [suggestions]);
  useEffect(() => {
    if (activeSuggestion < 0) return;
    document.getElementById(`hotel-sugg-${activeSuggestion}`)?.scrollIntoView({ block: "nearest" });
  }, [activeSuggestion]);
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggestions(true);
      if (!selectableIdx.length) return;
      const pos = selectableIdx.indexOf(activeSuggestion);
      const next =
        e.key === "ArrowDown"
          ? selectableIdx[(pos + 1) % selectableIdx.length]
          : selectableIdx[pos <= 0 ? selectableIdx.length - 1 : pos - 1];
      setActiveSuggestion(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        handleSuggestionClick(suggestions[activeSuggestion]);
      } else {
        setShowSuggestions(false);
        handleAdvancedSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

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

  function amenityMatch(text: string, key: string) {
    const words: Record<string, string[]> = {
      wifi: ["wifi", "wi-fi", "internet"],
      breakfast: ["breakfast"],
      parking: ["parking"],
      pool: ["pool", "swimming"],
      pet_friendly: ["pet"],
      ac: ["ac", "air condition"],
      gym: ["gym", "fitness"],
      restaurant: ["restaurant", "dining"],
      kitchen: ["kitchen"],
      laundry: ["laundry"],
    };
    return (words[key] ?? [key]).some((w) => text.includes(w));
  }
  function personalScore(h: PartnerHotel) {
    if (!profile) return 0;
    const types = (h.business_types?.length ? h.business_types : ["hotel"]).map(normalizeCategory);
    const am = (h.amenities || []).join(" ").toLowerCase();
    let s = (profile.cities[h.city?.toLowerCase()] || 0) * 3;
    types.forEach((t) => {
      s += (profile.types[t] || 0) * 2;
    });
    Object.entries(profile.amenities).forEach(([k, w]) => {
      if (amenityMatch(am, k)) s += w;
    });
    if (profile.avgMaxPrice && h.price_per_night <= profile.avgMaxPrice) s += 4;
    if ((profile.prefs.budget || 0) > 0 && h.price_per_night < 3000) s += profile.prefs.budget;
    if ((profile.prefs.luxury || 0) > 0 && (h.star_rating || 0) >= 4) s += profile.prefs.luxury;
    s += profile.viewedHotels[h.id] || 0;
    return s;
  }
  function relevance(h: PartnerHotel) {
    const am = (h.amenities || []).join(" ").toLowerCase();
    let s = personalScore(h) * 0.5;
    if (stayFilters.prefs.includes("budget") && h.price_per_night < 3000) s += 10;
    if (stayFilters.prefs.includes("luxury") && (h.star_rating || 0) >= 4) s += 10;
    s += stayFilters.amenities.filter((a) => amenityMatch(am, a)).length * 5;
    return s;
  }

  const applyAiIntent = (intent: AiIntent) => {
    const merged: StayFilters = {
      types: intent.business_types || [],
      prefs: intent.preferences || [],
      amenities: intent.amenities || [],
      maxPrice: intent.max_price || null,
    };
    setStayFilters(merged, { kinds: intent.accommodation_kinds || [], opt: intent.optional_amenities || [] });
    if (intent.location) {
      setSearchQuery(intent.location);
      setSelectedCity(intent.location);
      setSelectedLocality(null);
    }
    if (intent.adults) {
      setAdults(intent.adults);
      setTempAdults(intent.adults);
    }
    if (intent.children != null) {
      setChildren(intent.children);
      setTempChildren(intent.children);
    }
    if (intent.rooms) {
      setRooms(intent.rooms);
      setTempRooms(intent.rooms);
    }
    const start = intent.check_in ? new Date(intent.check_in) : checkIn;
    if (intent.check_in && !isNaN(start.getTime())) setCheckIn(start);
    if (intent.nights) {
      const out = new Date(isNaN(start.getTime()) ? checkIn : start);
      out.setDate(out.getDate() + intent.nights);
      setCheckOut(out);
    }
    logHotelSignal("search", {
      source: "ai",
      city: intent.location,
      business_types: merged.types,
      preferences: merged.prefs,
      amenities: merged.amenities,
      max_price: merged.maxPrice,
      adults: intent.adults,
      nights: intent.nights,
    });
    toast.success("AI applied your preferences");
  };

  const onStayFiltersChange = (f: StayFilters) => {
    setStayFilters(
      f,
      f.types.join() !== stayFilters.types.join() || f.amenities.join() !== stayFilters.amenities.join()
        ? { kinds: [], opt: [] }
        : undefined,
    );
    logHotelSignal("search", {
      source: "filters",
      city: selectedCity !== "all" ? selectedCity : null,
      business_types: f.types,
      preferences: f.prefs,
      amenities: f.amenities,
      max_price: f.maxPrice,
    });
  };

  // Filter and sort hotels
  const searchOutcome = useMemo(() => {
    // When the box shows a picked city/area label, the city+locality filters do the work.
    const q = searchQuery.trim() === locationLabel ? "" : searchQuery.trim().toLowerCase();
    let result = hotels.filter((hotel) => {
      const matchesCity =
        selectedCity === "all" ||
        isSameCity(hotel.city, selectedCity) ||
        hotel.city.toLowerCase().includes(selectedCity.toLowerCase());
      const matchesLocality = !selectedLocality || sameLocality(hotel.locality, selectedLocality);
      const matchesSearch =
        matchesLocality &&
        (!q ||
          hotel.name.toLowerCase().includes(q) ||
          hotel.city.toLowerCase().includes(q) ||
          hotel.locality.toLowerCase().includes(q) ||
          (hotel.address || "").toLowerCase().includes(q));

      let matchesPrice = true;
      if (selectedPriceRange !== "all") {
        const [min, max] = selectedPriceRange.split("-").map(Number);
        if (selectedPriceRange === "10000+") {
          matchesPrice = hotel.price_per_night >= 10000;
        } else {
          matchesPrice = hotel.price_per_night >= min && hotel.price_per_night <= max;
        }
      }

      // Occupancy: hotel must have room(s) that can actually host the guests,
      // either a single fitting room or a valid multi-room combination.
      const hotelRooms = roomsByHotel[hotel.id] || [];
      const matchesOccupancy =
        hotelRooms.length === 0
          ? false
          : hotelRooms.some((r) => roomFitsAlone(r, adults, children)) ||
            buildRoomCombinations(hotelRooms, adults, children, {
              maxRooms: Math.max(rooms, 6),
              limit: 1,
            }).length > 0;

      const matchesUnit = (() => {
        const wantUnits = stayFilters.prefs.map((p) => PREF_TO_UNIT[p]).filter(Boolean);
        const hUnits = unitsByHotel[hotel.id] || new Set(["room"]);
        return !wantUnits.length || wantUnits.some((u) => hUnits.has(u));
      })();
      const matchesBudget = !stayFilters.maxPrice || hotel.price_per_night <= stayFilters.maxPrice;

      // Hard filters: location, dates/guests, price.
      return matchesCity && matchesSearch && matchesPrice && matchesOccupancy && matchesBudget && matchesUnit && (!selectedStars.length || selectedStars.includes(Math.floor(hotel.star_rating || 0)));
    });

    // Requirement checks (AND logic). Stay type and amenities are separate:
    // "pool villa" = a villa (property type or accommodation) that also has a pool.
    const missing: Record<string, string[]> = {};
    const scored = result.map((hotel) => {
      const hTypes = (hotel.business_types?.length ? hotel.business_types : ["hotel"]).map(normalizeCategory);
      const feats = roomFeatures[hotel.id] || [];
      const roomKinds = new Set(feats.map((f) => f.kind));
      const hotelText = JSON.stringify([hotel.amenities, hotel.description]).toLowerCase();
      const miss: string[] = [];
      let hits = 0;

      if (stayFilters.types.length) {
        const ok = stayFilters.types.some((t) => hTypes.includes(t) || roomKinds.has(t));
        ok ? hits++ : miss.push("stay type");
      }
      // Rooms of the requested kind (e.g. villas) — amenities are then checked on those.
      let scope = feats;
      if (aiKinds.length) {
        const kindRooms = feats.filter((f) => aiKinds.includes(f.kind));
        const typeOk = aiKinds.some((k) => hTypes.includes(k));
        if (kindRooms.length) {
          scope = kindRooms;
          hits++;
        } else if (typeOk) hits++;
        else miss.push(aiKinds.map((k) => KIND_LABEL[k] || k).join("/"));
      }
      const scopeText = hotelText + scope.map((f) => f.text).join(" ");
      stayFilters.amenities.forEach((a) => {
        amenityMatch(scopeText, a) ? hits++ : miss.push(AMENITY_LABEL[a] || a);
      });
      const optHits = aiOptional.filter((a) => amenityMatch(scopeText, a)).length;
      if (miss.length) missing[hotel.id] = miss;
      return { hotel, hits, optHits, miss: miss.length };
    });

    const exact = scored.filter((s) => s.miss === 0);
    const hasRequirements = stayFilters.types.length + aiKinds.length + stayFilters.amenities.length > 0;
    // No exact match → show the closest partial matches, clearly labelled.
    const partial = exact.length === 0 && hasRequirements;
    const pool = partial ? scored.filter((s) => s.hits > 0) : exact;
    pool.sort(
      (a, b) =>
        b.hits - a.hits ||
        b.optHits - a.optHits ||
        relevance(b.hotel) - relevance(a.hotel) ||
        (b.hotel.star_rating || 0) - (a.hotel.star_rating || 0),
    );

    return { list: pool.map((s) => s.hotel), missing, partial };
  }, [
    hotels,
    selectedCity,
    selectedLocality,
    locationLabel,
    searchQuery,
    selectedPriceRange,
    selectedStars,
    roomsByHotel,
    adults,
    children,
    rooms,
    searchParams,
    unitsByHotel,
    roomFeatures,
    profile,
  ]);
  // Per-hotel presentation meta. Every value is derived from data a partner or
  // guest actually entered; missing data stays null/false and the row hides it.
  const hotelMetaById = useMemo(() => {
    const out: Record<string, { distance_km: number | null; free_cancellation: boolean; breakfast_included: boolean; review_count: number; avg_rating: number | null }> = {};
    hotels.forEach((h) => {
      const rooms = rawRooms.filter((r: any) => r.hotel_id === h.id);
      const agg = reviewMeta[h.id];
      out[h.id] = {
        distance_km: distanceFromCityCentre(h),
        free_cancellation: hasFreeCancellation(rooms),
        breakfast_included: hasBreakfast(rooms, h.amenities),
        review_count: agg?.count || 0,
        avg_rating: agg && agg.count ? Math.round((agg.total / agg.count) * 10) / 10 : null,
      };
    });
    return out;
  }, [hotels, rawRooms, reviewMeta]);

  const filteredAndSortedHotels = useMemo(() => {
    const list = searchOutcome.list.filter(h => (!savedOnly || favorites.includes(h.id)) && (!mapBounds || (h.latitude != null && h.longitude != null && h.latitude >= mapBounds.south && h.latitude <= mapBounds.north && h.longitude >= mapBounds.west && h.longitude <= mapBounds.east)));
    if (resultSort === "price-low") list.sort((a, b) => a.price_per_night - b.price_per_night);
    if (resultSort === "price-high") list.sort((a, b) => b.price_per_night - a.price_per_night);
    if (resultSort === "rating") list.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
    return list;
  }, [searchOutcome.list, resultSort, savedOnly, favorites, mapBounds]);
  const pickCityArea = (city: string, area: string | null) => {
    const label = area ? `${area}, ${city}` : city;
    setSelectedCity(city); setSelectedLocality(area); setSearchQuery(label); setLocationLabel(label);
    const next = new URLSearchParams(searchParams);
    next.set("city", city);
    if (area) next.set("locality", area); else next.delete("locality");
    setSearchParams(next, { replace: true });
  };
  const clearLocation = () => {
    setSelectedCity("all"); setSelectedLocality(null); setLocationLabel(""); setSearchQuery("");
    const next = new URLSearchParams(searchParams);
    next.delete("city"); next.delete("locality");
    setSearchParams(next, { replace: true });
  };
  const clearDiscoveryFilters = () => {
    setSelectedCity("all"); setSelectedLocality(null); setLocationLabel(""); setSearchQuery("");
    setMapBounds(null); setSavedOnly(false); setSelectedPriceRange("all"); setSelectedStars([]); setSearchParams(new URLSearchParams(), { replace: true });
  };

  // When a stay type is searched (e.g. "guest houses"), show each listing of that
  // type exactly as the partner entered it, instead of whole mixed properties.
  const typeListings = useMemo<StayListing[] | null>(() => {
    const want = [...stayFilters.types, ...aiKinds].map(normalizeCategory);
    if (!want.length) return null;
    const byId = new Map(filteredAndSortedHotels.map((h) => [h.id, h]));
    const seen = new Set<string>();
    const out: StayListing[] = [];
    rawRooms.forEach((r) => {
      const h = byId.get(r.hotel_id);
      if (!h) return;
      const kind = r.accommodation_kind || "room";
      const bt = r.attributes?.business_type
        ? normalizeCategory(r.attributes.business_type)
        : businessTypeForKind(kind);
      const roomType = bt ?? (h.business_types?.length === 1 ? normalizeCategory(h.business_types[0]) : null);
      if (!want.some((w) => w === roomType || (kind !== "room" && w === kind))) return;
      const text = JSON.stringify([r.room_type, r.amenities, r.attributes, r.description]).toLowerCase();
      if (!stayFilters.amenities.every((a) => amenityMatch(text, a))) return;
      if (stayFilters.maxPrice && Number(r.base_price) > 0 && Number(r.base_price) > stayFilters.maxPrice) return;
      const name = r.room_name || h.name;
      const area = r.attributes?.area || h.locality || "";
      const key = `${name}|${area}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const t = roomType || kind;
      const cv = customerView(r, bt ? [bt] : h.business_types);
      const rent = longStayQuote(r);
      out.push({
        id: r.id,
        hotelId: h.id,
        name,
        area,
        city: r.attributes?.area ? "" : h.city,
        typeLabel: t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        roomType: r.room_type || "",
        price: cv.kind.longStay ? rent.monthly || rent.weekly : Number(r.base_price) || 0,
        longStay: !!cv.kind.longStay,
        pricePeriod: cv.kind.longStay ? (rent.monthly ? "month" : "week") : "night",
        room: r,
        businessTypes: bt ? [bt] : h.business_types,
        photos: Array.isArray(r.photos) ? r.photos.filter(Boolean) : [],
        highlights: String(r.description || "")
          .split(/[;\n]/)
          .map((x: string) => x.trim())
          .filter(Boolean),
        maxAdults: r.max_adults ?? null,
        maxOccupancy: r.max_occupancy ?? null,
        units: r.total_units ?? null,
      });
    });
    // Hotel categories can describe the property rather than an individual room.
    if (!out.length && want.includes("hotel")) return null;
    return out.sort((a, b) => a.price - b.price);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAndSortedHotels, rawRooms, searchParams]);
  const bookListing = (l: StayListing) => {
    setOpenListing(null);
    if (l.longStay) {
      window.open(`/hotels/${l.hotelId}/long-stay?room=${l.id}`, "_blank", "noopener,noreferrer");
      return;
    }
    const h = hotels.find((x) => x.id === l.hotelId);
    if (!h) return;
    setBookRoomIds([l.id]);
    setSelectedHotel({ ...h, name: l.name, price_per_night: l.price });
    setShowHotelOnlyModal(true);
  };

  // Shared stay request → matching engine. Reasons come only from partner-entered data.
  const [matchById, setMatchById] = useState<Record<string, Match>>({});
  const searchKey = [
    selectedCity,
    searchQuery,
    checkIn?.toDateString(),
    checkOut?.toDateString(),
    adults,
    children,
    searchParams.toString(),
  ].join("|");
  useEffect(() => {
    const t = setTimeout(() => {
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const loc = (selectedCity && selectedCity !== "all" ? selectedCity : searchQuery || "").trim();
      matchStayRequest({
        source: "search",
        location: loc || undefined,
        city: loc || undefined,
        check_in: checkIn ? fmt(checkIn) : null,
        check_out: checkOut ? fmt(checkOut) : null,
        adults: Math.max(1, adults),
        children,
        business_types: stayFilters.types,
        preferences: stayFilters.prefs,
        amenities: stayFilters.amenities,
        budget_max: stayFilters.maxPrice,
      })
        .then((r) => setMatchById(Object.fromEntries((r?.matches ?? []).map((m) => [m.hotel_id, m]))))
        .catch(() => setMatchById({}));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  // Personal recommendations from the signed-in user's activity.
  const recommended = useMemo(() => {
    if (!profile) return [];
    return [...hotels]
      .map((h) => ({ h, s: personalScore(h) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.h);
  }, [hotels, profile]);

  // "Needs N rooms" hint per hotel when a single room cannot host the group.
  const roomsNeededByHotel = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAndSortedHotels.forEach((h) => {
      const hotelRooms = roomsByHotel[h.id] || [];
      if (hotelRooms.some((r) => roomFitsAlone(r, adults, children))) return;
      const combo = buildRoomCombinations(hotelRooms, adults, children, {
        maxRooms: Math.max(rooms, 6),
        limit: 1,
      })[0];
      if (combo) map[h.id] = combo.totalRooms;
    });
    return map;
  }, [filteredAndSortedHotels, roomsByHotel, adults, children, rooms]);

  // After a Search click, report result count once the filter memo has resettled.
  useEffect(() => {
    if (searchSubmitToken === 0) return;
    const count = filteredAndSortedHotels.length;
    const q = searchQuery.trim();
    if (count === 0) {
      toast.info(`No hotels found${q ? ` for "${q}"` : ""}. Try different filters.`);
    } else {
      toast.success(`${count} hotel${count === 1 ? "" : "s"} match your search`);
    }
  }, [searchSubmitToken]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === searchQuery.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        navigate(`/hotels?city=${encodeURIComponent(matchedCity)}`);
      }
    }
    setShowSuggestions(false);
  };

  const handleAdvancedSearch = () => {
    setShowSuggestions(false);
    const q = searchQuery.trim();
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    if (selectedLocality && q === locationLabel) {
      params.set("city", selectedCity); params.set("locality", selectedLocality);
    } else {
      params.delete("locality"); setSelectedLocality(null);
      const resolvedCity = hotels.find(h => isSameCity(h.city, q))?.city || popularLocations.find(c => isSameCity(c, q));
      setSelectedCity(resolvedCity || "all");
      if (resolvedCity) params.set("city", resolvedCity); else { params.delete("city"); if (q) params.set("search", q); }
    }
    params.set("checkin", format(checkIn, "yyyy-MM-dd"));
    params.set("checkout", format(checkOut, "yyyy-MM-dd"));
    params.set("rooms", String(rooms)); params.set("adults", String(adults)); params.set("children", String(children));
    if (selectedPriceRange !== "all") params.set("price", selectedPriceRange);
    setSearchParams(params, { replace: true });
    setMapBounds(null);
    setSearchSubmitToken(n => n + 1);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "city") {
      setSelectedCity(suggestion.name);
      setSelectedLocality(null);
      setSearchQuery(suggestion.name);
      setLocationLabel(suggestion.name);
      setSearchParams(prev => { const next = new URLSearchParams(prev); next.set("city", suggestion.name); next.delete("locality"); return next; }, { replace: true });
    } else if (suggestion.type === "locality" && suggestion.city) {
      const label = `${suggestion.name}, ${suggestion.city}`;
      setSelectedCity(suggestion.city);
      setSelectedLocality(suggestion.name);
      setSearchQuery(label);
      setLocationLabel(label);
      setSearchParams(prev => { const next = new URLSearchParams(prev); next.set("city", suggestion.city || ""); next.set("locality", suggestion.name); return next; }, { replace: true });
    } else if (suggestion.type === "hotel" || suggestion.type === "locality") {
      setSelectedLocality(null);
      setSearchQuery(suggestion.name);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else if (suggestion.type === "recent") {
      setSearchQuery(suggestion.name);
      const matchedCity = popularLocations.find((c) => c.toLowerCase() === suggestion.name.toLowerCase());
      if (matchedCity) {
        setSelectedCity(matchedCity);
        navigate(`/hotels?city=${encodeURIComponent(matchedCity)}`);
      }
    }
    setShowSuggestions(false);
  };

  const handleHotelClick = (hotel: PartnerHotel) => {
    logHotelSignal("view", { city: hotel.city, business_types: hotel.business_types ?? [] }, hotel.id);
    window.open(`/hotels/${hotel.id}`, "_blank", "noopener,noreferrer");
  };

  const toggleFavorite = (hotelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!favorites.includes(hotelId)) logHotelSignal("shortlist", {}, hotelId);
    setFavorites(prev => { const next = prev.includes(hotelId) ? prev.filter(id => id !== hotelId) : [...prev, hotelId]; localStorage.setItem("jaaga_saved_hotels", JSON.stringify(next)); return next; });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
        ))}
      </div>
    );
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "city":
        return <MapPin className="h-4 w-4 text-primary" />;
      case "hotel":
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case "locality":
        return <MapPin className="h-4 w-4 text-purple-600" />;
      case "popular":
        return <TrendingUpIcon className="h-4 w-4 text-orange-600" />;
      case "recent":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSuggestionBgColor = (type: string) => {
    switch (type) {
      case "city":
        return "bg-accent";
      case "hotel":
        return "bg-blue-50";
      case "locality":
        return "bg-purple-50";
      case "popular":
        return "bg-orange-50";
      case "recent":
        return "bg-muted/40";
      default:
        return "bg-muted/40";
    }
  };

  const getGuestDisplayText = () => {
    let text = `${rooms} Room${rooms > 1 ? "s" : ""}`;
    text += `, ${adults} Adult${adults > 1 ? "s" : ""}`;
    if (children > 0) {
      text += `, ${children} Child${children > 1 ? "ren" : ""}`;
    }
    return text;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background hotel-discovery">
      <Navigation hotelDiscovery onHotelWishlist={() => setSavedOnly(v => !v)} />

      <main className="relative z-0 flex-1">
        <section className="relative pb-4">
          <img src={hotelBanner} alt="Beach resort with pool and tropical villas" width={1920} height={640} className="absolute inset-x-0 top-0 h-[300px] w-full object-cover" />
          <div className="hotel-banner-shade absolute inset-x-0 top-0 h-[300px]" />
          <div className="relative mx-auto w-full max-w-[1600px] px-4 pt-8 lg:px-8">
            <div className="mb-4 flex items-center justify-between gap-4 text-primary-foreground">
              <div>
                
                <h1 className="text-3xl font-bold md:text-4xl">Find Your Perfect Stay</h1>
                <p className="mt-1 text-sm">Hotels, Resorts, Service Apartments, PGs, Hostels, Co-living and unique stays — all on Jaaga.</p>
              </div>
              <Button variant="secondary" onClick={() => navigate("/partners")} className="hidden gap-2 sm:inline-flex"><Handshake className="h-4 w-4" />List your property</Button>
            </div>

            {/* Advanced Search Bar */}
            <div className="relative z-20 rounded-lg border border-primary/20 bg-accent p-3 text-card-foreground shadow-lg md:p-4">
              <div className="mb-3 flex items-center gap-3"><Sparkles className="h-7 w-7 shrink-0 text-primary" /><span className="shrink-0 whitespace-nowrap text-sm font-bold text-primary">Jaaga AI</span><div className="no-scrollbar flex gap-2 overflow-x-auto">{["Family vacation in Goa", "Business stay in Hyderabad", "Long stay for work", "Budget stay near me", "Resort with swimming pool"].map(text => <Button key={text} size="sm" variant="secondary" className="h-7 shrink-0 rounded-full text-xs" onClick={() => { window.dispatchEvent(new CustomEvent("jaaga-stay-ai-prompt", { detail: text })); }}>{text}</Button>)}</div></div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr]">
                {/* Location */}
                <div ref={searchRef} className="relative col-span-2 lg:col-span-1">
                  <label className="text-xs font-medium text-foreground block mb-1">
                    <MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />
                    Where do you want to stay?
                  </label>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      placeholder="Where do you want to stay?"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedLocality) setSelectedLocality(null);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={handleSearchKeyDown}
                      role="combobox"
                      aria-expanded={showSuggestions}
                      autoComplete="off"
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent h-10"
                    />

                    {/* Suggestions Dropdown - IMPROVED to match image 1 */}
                    {showSuggestions && (
                      <div
                        role="listbox"
                        className="absolute top-full left-0 right-0 md:min-w-[340px] mt-1 bg-card rounded-lg shadow-xl border border-border z-[100] max-h-[60vh] md:max-h-96 overflow-y-auto overscroll-contain"
                      >
                        {isSearching ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                            Searching...
                          </div>
                        ) : suggestions.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            No locations found for "{searchQuery}". Try a city like Hyderabad or an area like Madhapur.
                          </div>
                        ) : (
                          suggestions.map((suggestion, index) => {
                            // Skip rendering "SUGGESTIONS" as a separate item, we'll render it as a header
                            if (suggestion.type === "popular") {
                              return (
                                <div
                                  key={`header-${index}`}
                                  className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border-b border-border/50"
                                >
                                  {suggestion.name}
                                </div>
                              );
                            }

                            // Recent search item
                            if (suggestion.type === "recent") {
                              return (
                                <button
                                  key={`${suggestion.type}-${suggestion.name}-${index}`}
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors flex items-start gap-3 border-b border-border/50 last:border-b-0 group"
                                >
                                  <div className="p-1.5 bg-muted rounded-full flex-shrink-0 mt-0.5">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-foreground">{suggestion.name}</span>
                                      <span className="text-xs text-muted-foreground">{suggestion.date}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{suggestion.guests}</p>
                                  </div>
                                </button>
                              );
                            }

                            // City, Hotel, Locality suggestions
                            return (
                              <button
                                key={`${suggestion.type}-${suggestion.name}-${index}`}
                                id={`hotel-sugg-${index}`}
                                role="option"
                                aria-selected={activeSuggestion === index}
                                onMouseEnter={() => setActiveSuggestion(index)}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className={`w-full px-4 py-3 min-h-[48px] text-left hover:bg-muted/40 transition-colors flex items-center gap-3 border-b border-border/50 last:border-b-0 group ${activeSuggestion === index ? "bg-accent" : ""}`}
                              >
                                <div
                                  className={`p-1.5 ${getSuggestionBgColor(suggestion.type)} rounded-full flex-shrink-0`}
                                >
                                  {getSuggestionIcon(suggestion.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">{suggestion.name}</span>
                                    {suggestion.count !== undefined && suggestion.count > 0 && (
                                      <span className="text-xs text-primary font-medium">
                                        {suggestion.count} {suggestion.count === 1 ? "hotel" : "hotels"}
                                      </span>
                                    )}
                                  </div>
                                  {suggestion.subtitle && (
                                    <p className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</p>
                                  )}
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground/40 rotate-[-90deg] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-end"><StayDatePicker label="Check-in" value={checkIn} min={new Date()} onChange={date => { setCheckIn(date); if (checkOut <= date) { const out = new Date(date); out.setDate(out.getDate() + 1); setCheckOut(out); } }} /></div>
                <div className="flex items-end"><StayDatePicker label="Check-out" value={checkOut} min={new Date(checkIn.getTime() + 86400000)} onChange={setCheckOut} /></div>

                {/* Rooms & Guests */}
                <div ref={guestSelectorRef} className="relative">
                  <label className="text-xs font-medium text-foreground block mb-1">
                    <Users className="h-3 w-3 inline mr-1 text-muted-foreground" />
                    Rooms & Guests
                  </label>
                  <Button variant="outline" aria-label="Rooms and guests" aria-expanded={showGuestSelector}
                    onClick={() => {
                      setTempRooms(rooms);
                      setTempAdults(adults);
                      setTempChildren(children);
                      setTempChildAges(childAges);
                      setShowGuestSelector(!showGuestSelector);
                      setShowChildAgeSelector(false);
                    }}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground cursor-pointer hover:border-primary transition-colors min-h-10 flex items-center justify-between"
                  >
                    <span className="truncate text-xs md:text-sm">{getGuestDisplayText()}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ml-2 ${showGuestSelector ? "rotate-180" : ""}`}
                    />
                  </Button>

                  {showGuestSelector && (
                    <div className="absolute top-full right-0 mt-2 bg-card rounded-xl shadow-2xl border border-border z-[200] p-4 w-[320px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
                      {/* Rooms */}
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Rooms <span className="text-primary font-bold ml-1">{tempRooms}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Upto 4 rooms</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setTempRooms(Math.max(1, tempRooms - 1))}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{tempRooms}</span>
                          <button
                            onClick={() => setTempRooms(Math.min(4, tempRooms + 1))}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Adults */}
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Adults <span className="text-primary font-bold ml-1">{tempAdults}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Age 18+</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setTempAdults(Math.max(1, tempAdults - 1))}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{tempAdults}</span>
                          <button
                            onClick={() => setTempAdults(Math.min(10, tempAdults + 1))}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Children <span className="text-primary font-bold ml-1">{tempChildren}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">0 - 17 Years Old</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setTempChildren(Math.max(0, tempChildren - 1));
                              if (tempChildren <= 1) setShowChildAgeSelector(false);
                            }}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{tempChildren}</span>
                          <button
                            onClick={() => {
                              setTempChildren(Math.min(6, tempChildren + 1));
                              if (tempChildren + 1 > 0) setShowChildAgeSelector(true);
                            }}
                            className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Children Age Selector */}
                      {showChildAgeSelector && tempChildren > 0 && (
                        <div className="py-3 border-b border-border/50">
                          <p className="text-sm font-medium text-foreground mb-2">Age of Children</p>
                          <div className="space-y-2">
                            {tempChildAges.map((child, index) => (
                              <div key={child.id} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-16">Child {index + 1}</span>
                                <select
                                  value={child.age}
                                  onChange={(e) => {
                                    const newAges = [...tempChildAges];
                                    newAges[index] = { ...child, age: e.target.value };
                                    setTempChildAges(newAges);
                                  }}
                                  className="flex-1 border border-input rounded-lg px-3 py-1.5 text-sm bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                  {ageOptions.map((age) => (
                                    <option key={age} value={age}>
                                      {age}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground text-center">
                          Please provide right number of children along with their right age for best options and
                          prices.
                        </p>
                      </div>

                      {/* Apply Button */}
                      <div className="mt-4 pt-3 border-t border-border">
                        <Button
                          onClick={() => {
                            setRooms(tempRooms);
                            setAdults(tempAdults);
                            setChildren(tempChildren);
                            setChildAges(tempChildAges);
                            setShowGuestSelector(false);
                            setShowChildAgeSelector(false);
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-all"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="flex items-end">
                  <div className="w-full">
                    <Button
                      onClick={handleAdvancedSearch}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground w-full px-3 h-12 shadow-md hover:shadow-lg transition-all flex-shrink-0"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Stays
                    </Button>
                  </div>
                </div>
              </div>

              
            </div>
            <div className="mt-3">
            {/* AI search + filters on the green hero */}
            <StayFinder
              value={stayFilters}
              onChange={onStayFiltersChange}
              onAiIntent={applyAiIntent}
              detectCity={(text) => {
                const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, " ")} `;
                let best: { name: string; areas: { name: string; count: number }[] } | null = null;
                locationIndex.forEach((c) => {
                  if (best) return;
                  if ([c.name, c.key].some((n) => n && t.includes(` ${n.toLowerCase()} `)))
                    best = { name: c.name, areas: c.localities.slice(0, 12) };
                });
                if (!best && selectedCity !== "all") {
                  const c = Array.from(locationIndex.values()).find((x) => isSameCity(x.name, selectedCity));
                  if (c) best = { name: c.name, areas: c.localities.slice(0, 12) };
                }
                return best;
              }}
              selectedArea={selectedLocality}
              onPickArea={(city, area) => {
                const label = area ? `${area}, ${city}` : city;
                setSelectedCity(city);
                setSelectedLocality(area);
                setSearchQuery(label);
                setLocationLabel(label);
                const next = new URLSearchParams(searchParams);
                next.set("city", city);
                if (area) next.set("locality", area);
                else next.delete("locality");
                setSearchParams(next, { replace: true });
              }}
            />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 lg:px-8">
          <StayCategoryTabs value={stayFilters} onChange={onStayFiltersChange} />
          <MyHotelApplicationsBanner />

          {recommended.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-4 w-4 text-primary" /> Recommended for you
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recommended.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleHotelClick(h)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 text-left shadow-sm transition hover:shadow-md"
                  >
                    <img
                      src={h.images?.[0]}
                      alt={h.name}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{h.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {h.locality}, {h.city}
                      </p>
                      <p className="text-xs font-semibold text-primary">
                        from ₹{Number(h.price_per_night).toLocaleString("en-IN")}/night
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)] ${desktopMapVisible ? "xl:grid-cols-[210px_minmax(0,1fr)_340px]" : ""}`}>
            <HotelDiscoveryFilters value={stayFilters} onChange={onStayFiltersChange} stars={selectedStars} onStarsChange={setSelectedStars} cityIndex={locationIndex} selectedCity={selectedCity} selectedArea={selectedLocality} onPickCityArea={pickCityArea} onClearLocation={clearLocation} onClear={clearDiscoveryFilters} />
            <div className={`min-w-0 ${mapView ? "hidden xl:block" : ""}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-lg font-bold">{loading ? "Finding stays…" : `${filteredAndSortedHotels.length} ${filteredAndSortedHotels.length === 1 ? "Hotel" : "Hotels"}`}{selectedCity !== "all" && <span className="font-normal"> in {selectedCity}</span>}</h2><p className="text-xs text-muted-foreground">{format(checkIn, "dd MMM yyyy")} – {format(checkOut, "dd MMM yyyy")} · {getGuestDisplayText()}</p></div>
                <div className="flex items-center gap-2"><Button size="sm" variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)}>Filters</Button><Button size="sm" variant={mapView ? "default" : "outline"} onClick={() => { setMapView(v => !v); setDesktopMapVisible(v => !v); }}>{mapView ? "List View" : "Map View"}</Button><select aria-label="Sort hotels" value={resultSort} onChange={e => setResultSort(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-xs"><option value="recommended">Recommended</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="rating">Star rating</option></select><div className="flex rounded-md border border-border p-0.5"><Button size="icon" variant={!gridView ? "default" : "ghost"} className="h-8 w-8" aria-label="List view" aria-pressed={!gridView} onClick={() => setGridView(false)}><List className="h-4 w-4" /></Button><Button size="icon" variant={gridView ? "default" : "ghost"} className="h-8 w-8" aria-label="Grid view" aria-pressed={gridView} onClick={() => setGridView(true)}><LayoutGrid className="h-4 w-4" /></Button></div></div>
              </div>
          <div className="mb-4"><StayIntentStrip value={stayFilters} onChange={onStayFiltersChange} /></div>
          {/* Hotels Grid */}
          {filteredAndSortedHotels.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl shadow-sm border border-border/50">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hotel className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No hotels found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : "We couldn't find any hotels matching your criteria."}
                Try adjusting your filters or search for a different city.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-primary/30 text-primary hover:bg-accent"
                onClick={clearDiscoveryFilters}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              {searchOutcome.partial && !typeListings && (
                <div className="mb-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
                  No stay matches every requirement yet. Showing the closest matches — each card shows what's missing.
                </div>
              )}
              {typeListings ? (
                typeListings.length === 0 ? (
                  <p className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                    No stays of this type match your search yet. Try another city or remove some requirements.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {typeListings.map((l) => (
                      <Card
                        key={l.id}
                        className="flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border shadow-sm transition-shadow hover:shadow-md"
                        onClick={() =>
                          window.open(`/hotels/${l.hotelId}?room=${l.id}`, "_blank", "noopener,noreferrer")
                        }
                      >
                        <div className="h-52 w-full bg-muted">
                          {l.photos[0] ? (
                            <img src={l.photos[0]} alt={l.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Hotel className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="flex flex-1 flex-col p-3.5">
                          <Badge variant="secondary" className="mb-1 w-fit text-[10px]">
                            {l.typeLabel}
                          </Badge>
                          <h3 className="line-clamp-1 text-sm font-semibold">{l.name}</h3>
                          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="line-clamp-1">{[l.area, l.city].filter(Boolean).join(", ")}</span>
                          </p>
                          {l.highlights.length > 0 && (
                            <p className="mb-2 line-clamp-2 text-[11px] text-muted-foreground">
                              {l.highlights.slice(0, 3).join(" · ")}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5">
                            <div>
                              <span className="text-lg font-bold text-primary">₹{l.price.toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-muted-foreground">/{l.pricePeriod || "night"}</span>
                            </div>
                            <Button
                              size="sm"
                              className="h-8 rounded-xl px-4 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (l.longStay)
                                  window.open(`/hotels/${l.hotelId}?room=${l.id}`, "_blank", "noopener,noreferrer");
                                else bookListing(l);
                              }}
                            >
                              {l.longStay ? "View & Book" : "Book"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                <div className={gridView ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                  {filteredAndSortedHotels.map(hotel => <HotelResultRow key={hotel.id} hotel={{ ...hotel, ...(hotelMetaById[hotel.id] || {}) }} selected={mapSelectedId === hotel.id} onSelect={() => setMapSelectedId(hotel.id)} grid={gridView} favorite={favorites.includes(hotel.id)} onFavorite={e => toggleFavorite(hotel.id, e)} onDetails={() => handleHotelClick(hotel)}>
                    {searchOutcome.partial && searchOutcome.missing[hotel.id]?.length ? <p className="text-xs text-destructive">Partial match · missing {searchOutcome.missing[hotel.id].join(", ")}</p> : null}
                    {matchById[hotel.id]?.reasons?.length ? <p className="rounded-md bg-accent px-2 py-1.5 text-xs text-primary">✓ {matchById[hotel.id].reasons.slice(0, 3).map(r => r.label).join(" · ")}</p> : null}
                    {roomsNeededByHotel[hotel.id] ? <p className="text-xs text-muted-foreground">Needs {roomsNeededByHotel[hotel.id]} rooms for {adults + children} guests</p> : null}
                  </HotelResultRow>)}
                </div>
              )}
            </>
          )}
            </div>
            <aside className={`${mapView ? "block lg:col-start-2 xl:col-start-auto" : desktopMapVisible ? "hidden xl:block" : "hidden"} self-start xl:sticky xl:top-24`}><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">Explore on map</span><Button variant="ghost" size="sm" onClick={() => { setMapView(false); setDesktopMapVisible(false); }}>List View</Button></div><HotelDiscoveryMap hotels={filteredAndSortedHotels} selectedId={mapSelectedId} onSelect={setMapSelectedId} onDetails={hotel => { const h = hotels.find(h => h.id === hotel.id); if (h) handleHotelClick(h); }} onSearchArea={setMapBounds} /></aside>
          </div>
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="left" className="overflow-y-auto"><SheetHeader><SheetTitle>Refine Your Stay</SheetTitle></SheetHeader><HotelDiscoveryFilters mobile value={stayFilters} onChange={onStayFiltersChange} stars={selectedStars} onStarsChange={setSelectedStars} cityIndex={locationIndex} selectedCity={selectedCity} selectedArea={selectedLocality} onPickCityArea={pickCityArea} onClearLocation={clearLocation} onClear={clearDiscoveryFilters} /></SheetContent></Sheet>
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
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={adults + children}
          initialRooms={rooms}
          onlyRoomIds={bookRoomIds}
        />
      )}
      <StayListingDetail listing={openListing} onClose={() => setOpenListing(null)} onBook={bookListing} />

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
