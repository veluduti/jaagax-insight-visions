import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInView } from "@/hooks/useInView";
import {
  Sparkles,
  MapPin,
  SlidersHorizontal,
  Building2,
  Shield,
  TrendingUp,
  ChevronRight,
  Users,
  Home,
  BarChart3,
  Star,
  Info,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdvancedFilters } from "@/components/search/AdvancedFiltersSheet";
import { DEFAULT_FILTERS } from "@/components/search/AdvancedFiltersSheet";
import { openInNewTab, propertyPath, projectPath } from "@/lib/openInNewTab";
import { classifyProperty } from "@/lib/propertyClassifier";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { canonicalizeCity, getCityAliases, isSameCity } from "@/lib/cityNormalizer";

// Lazy-load heavy filter sheet (Phase 5)
const AdvancedFiltersSheet = lazy(() => import("@/components/search/AdvancedFiltersSheet"));

// Page size for incremental loading (Phase 5)
const PAGE_SIZE = 24;

/**
 * Merge a raw property row with its final_data-driven public view so
 * downstream cards always render approved values (final_data first).
 * Rule: never expose agent_data / seller_data on the frontend.
 */
const toPublicRow = (row: any) => {
  const v = getPublicPropertyView(row);
  if (!v) return row;
  return {
    ...row,
    title: v.title,
    description: v.description ?? row.description,
    city: v.city ?? row.city,
    locality: v.locality ?? row.locality,
    address: v.address ?? row.address,
    price: v.price ?? row.price,
    area_sqft: v.area_sqft ?? row.area_sqft,
    bhk: v.bhk ?? row.bhk,
    bedrooms: v.bedrooms ?? row.bedrooms,
    bathrooms: v.bathrooms ?? row.bathrooms,
    type: v.type ?? row.type,
    listing_type: v.listing_type ?? row.listing_type,
    furnishing: v.furnishing ?? row.furnishing,
    images: v.images?.length ? v.images : row.images,
    video_urls: v.video_urls?.length ? v.video_urls : row.video_urls,
    amenities: v.amenities?.length ? v.amenities : row.amenities,
    latitude: v.latitude ?? row.latitude,
    longitude: v.longitude ?? row.longitude,
    rera_id: v.rera_id ?? row.rera_id,
  };
};
import LocationSelector from "@/components/location/LocationSelector";
import LocationPill from "@/components/location/LocationPill";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";

interface Property {
  id: string;
  slug?: string | null;
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
  slug?: string | null;
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
  property_id: string;
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
  const { detectedLocation, savedLocation, hasLocation } = useLocationContext();

  // Tab state
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "properties");

  // Search state - default to saved/detected city if no search param
  const [location, setLocation] = useState(
    searchParams.get("city") || searchParams.get("q") || savedLocation?.city || detectedLocation?.city || "",
  );
  const [searchType, setSearchType] = useState(searchParams.get("type") || "buy");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [decisions, setDecisions] = useState<Map<string, PropertyDecision>>(new Map());

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [total, setTotal] = useState(0);

  // Advanced filters initialised from URL
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(() => ({
    ...DEFAULT_FILTERS,
    propertyType: searchParams.get("propertyType") || "any",
    beds: searchParams.get("beds") || "any",
    bathrooms: searchParams.get("bathrooms") || "any",
    priceMin: Number(searchParams.get("priceMin") || 0),
    priceMax: Number(searchParams.get("priceMax") || 0),
    areaMin: Number(searchParams.get("areaMin") || 0),
    areaMax: Number(searchParams.get("areaMax") || 0),
    furnishing: searchParams.get("furnishing") || "any",
    amenities: searchParams.get("amenities")?.split(",").filter(Boolean) || [],
    floorLevel: searchParams.get("floorLevel") || "any",
    parkingSpaces: searchParams.get("parking") || "any",
    facing: searchParams.get("facing") || "any",
    possessionStatus: searchParams.get("status") || "any",
    propertyAge: searchParams.get("age") || "any",
    listedBy: searchParams.get("listedBy") || "any",
    verifiedOnly: searchParams.get("verified") === "1",
    postedWithin: searchParams.get("posted") || "any",
    reraOnly: searchParams.get("rera") === "1",
    projectName: searchParams.get("projectName") || "",
    handoverBy: searchParams.get("handoverBy") || "any",
    paymentPlan: searchParams.get("paymentPlan") || "any",
  }));

  const lastSearchKey = useRef<string>("");
  const popularLocations = useMemo(() => ["Hyderabad", "Vijayawada", "Vizag", "Guntur", "Bangalore"], []);

  const navItems = useMemo(() => [{ label: "Properties", value: "properties", icon: Home }], []);

  // Debounced filter inputs to avoid refetching on every keystroke / slider tick (Phase 5)
  const debouncedLocation = useDebouncedValue(location, 350);
  const debouncedFilters = useDebouncedValue(advancedFilters, 300);

  // Reset page whenever the effective query changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedLocation, searchType, debouncedFilters, savedLocation?.latitude, savedLocation?.longitude]);

  // Fetch data when tab or (debounced) filters change
  useEffect(() => {
    fetchData(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedLocation, searchType, debouncedFilters, savedLocation?.latitude, savedLocation?.longitude]);

  // When the user picks a new saved location, reflect it in the search input
  useEffect(() => {
    if (savedLocation?.city && !searchParams.get("city") && !searchParams.get("q")) {
      setLocation(savedLocation.city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLocation?.city, savedLocation?.area]);

  // Fetch AI decisions for properties
  useEffect(() => {
    if (activeTab === "properties" && properties.length > 0 && user && role === "buyer" && hasBuyerContext) {
      fetchAIDecisions();
    }
  }, [properties, user, role, hasBuyerContext, buyerContext, activeTab]);

  const fetchData = async (pageNum: number = 1, append: boolean = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      switch (activeTab) {
        case "properties":
          await fetchProperties(pageNum, append);
          break;
        case "new-projects":
          await fetchProjects(pageNum, append);
          break;
        case "transactions":
          await fetchTransactions(pageNum, append);
          break;
        case "agents":
          await fetchAgents(pageNum, append);
          break;
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Apply all advanced filters to a Supabase properties query builder
  const applyPropertyFilters = (qb: any) => {
    const f = advancedFilters;
    if (f.verifiedOnly) qb = qb.eq("verified", true);
    if (location) {
      const normalizedLocation = canonicalizeCity(location);
      const aliases = getCityAliases(normalizedLocation);
      const cityClause = aliases.map((a) => `city.ilike.%${a}%`).join(",");
      qb = qb.or(`title.ilike.%${location}%,locality.ilike.%${location}%,${cityClause}`);
    }
    // Buy/Rent → listing_type
    if (searchType === "rent") qb = qb.eq("listing_type", "rent");
    else if (searchType === "buy") qb = qb.eq("listing_type", "sale");
    if (f.propertyType !== "any") qb = qb.eq("type", f.propertyType);
    if (f.beds !== "any") {
      if (f.beds === "5+") qb = qb.gte("bhk", 5);
      else qb = qb.eq("bhk", Number(f.beds));
    }
    if (f.bathrooms !== "any") {
      if (f.bathrooms === "4+") qb = qb.gte("bathrooms", 4);
      else qb = qb.eq("bathrooms", Number(f.bathrooms));
    }
    if (f.priceMin > 0) qb = qb.gte("price", f.priceMin);
    if (f.priceMax > 0) qb = qb.lte("price", f.priceMax);
    if (f.areaMin > 0) qb = qb.gte("area_sqft", f.areaMin);
    if (f.areaMax > 0) qb = qb.lte("area_sqft", f.areaMax);
    if (f.furnishing !== "any") qb = qb.eq("furnishing", f.furnishing);
    if (f.amenities.length > 0) qb = qb.contains("amenities", f.amenities);
    if (f.floorLevel !== "any") {
      if (f.floorLevel === "ground") qb = qb.eq("floor_number", 0);
      else if (f.floorLevel === "low") qb = qb.gte("floor_number", 1).lte("floor_number", 5);
      else if (f.floorLevel === "mid") qb = qb.gte("floor_number", 6).lte("floor_number", 15);
      else if (f.floorLevel === "high") qb = qb.gte("floor_number", 16);
    }
    if (f.parkingSpaces !== "any") {
      if (f.parkingSpaces === "3+") qb = qb.gte("total_parking", 3);
      else qb = qb.eq("total_parking", Number(f.parkingSpaces));
    }
    if (f.possessionStatus !== "any") qb = qb.eq("completion_stage", f.possessionStatus);
    if (f.propertyAge !== "any") qb = qb.eq("property_age", f.propertyAge);
    if (f.listedBy !== "any") qb = qb.eq("listed_by", f.listedBy);
    if (f.postedWithin !== "any") {
      const days = Number(f.postedWithin);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      qb = qb.gte("created_at", since);
    }
    return qb;
  };

  const fetchProperties = async (pageNum: number = 1, append: boolean = false) => {
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // City-based discovery with nearby prioritization.
    // Strategy: fetch ALL properties matching the user's city (no hard radius),
    // then sort client-side by distance to user coords so nearby localities rank first.
    let qb = supabase.from("properties").select("*", { count: "exact" }).neq("is_draft", true).eq("verified", true);
    qb = applyPropertyFilters(qb);
    const { data, error, count } = await qb
      .order("is_featured", { ascending: false })
      .order("trust_score", { ascending: false })
      .range(from, to);
    if (error) return;

    const all = ((data as any[]) || []).map(toPublicRow);
    const normalizedLocation = canonicalizeCity(location);
    let filtered = all
      .filter((p) => !normalizedLocation || isSameCity(p.city, normalizedLocation))
      .filter((p) => classifyProperty(p) !== "draft");

    // 10km radius hard filter + nearby-first sort when we have user coords.
    const uLat = savedLocation?.latitude;
    const uLng = savedLocation?.longitude;
    if (typeof uLat === "number" && typeof uLng === "number") {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const haversine = (lat: number, lng: number) => {
        const R = 6371;
        const dLat = toRad(lat - uLat);
        const dLng = toRad(lng - uLng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(uLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
      };
      const RADIUS_KM = 10;
      filtered = filtered
        .filter((p) => {
          if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return false;
          return haversine(p.latitude, p.longitude) <= RADIUS_KM;
        })
        .sort((a, b) => haversine(a.latitude, a.longitude) - haversine(b.latitude, b.longitude));
    }

    setProperties((prev) => (append ? [...prev, ...filtered] : filtered));
    setTotal(count || filtered.length);
    setHasMore((data?.length || 0) >= PAGE_SIZE);
  };

  const fetchProjects = async (pageNum: number = 1, append: boolean = false) => {
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const f = advancedFilters;
    let qb = supabase.from("projects").select("*", { count: "exact" });
    if (f.verifiedOnly) qb = qb.eq("verified", true);
    if (location) {
      const normalizedLocation = canonicalizeCity(location);
      const aliases = getCityAliases(normalizedLocation);
      const cityClause = aliases.map((a) => `city.ilike.%${a}%`).join(",");
      qb = qb.or(`name.ilike.%${location}%,locality.ilike.%${location}%,${cityClause}`);
    }
    if (f.projectName) qb = qb.ilike("name", `%${f.projectName}%`);
    if (f.propertyType !== "any") qb = qb.eq("project_type", f.propertyType);
    if (f.priceMin > 0) qb = qb.gte("avg_price", f.priceMin);
    if (f.priceMax > 0) qb = qb.lte("avg_price", f.priceMax);
    if (f.amenities.length > 0) qb = qb.contains("amenities", f.amenities);
    if (f.reraOnly) qb = qb.not("rera_id", "is", null);
    if (f.handoverBy !== "any") {
      const year = f.handoverBy.replace("+", "");
      const startDate = `${year}-01-01`;
      if (f.handoverBy.endsWith("+")) qb = qb.gte("possession_date", startDate);
      else qb = qb.gte("possession_date", startDate).lt("possession_date", `${Number(year) + 1}-01-01`);
    }
    const { data, error, count } = await qb.order("trust_score", { ascending: false }).range(from, to);
    if (!error) {
      const all = (data as any[]) || [];
      const normalizedLocation = canonicalizeCity(location);
      let strict = all.filter((p) => !normalizedLocation || isSameCity(p.city, normalizedLocation));

      const uLat = savedLocation?.latitude;
      const uLng = savedLocation?.longitude;
      if (typeof uLat === "number" && typeof uLng === "number") {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const haversine = (lat: number, lng: number) => {
          const R = 6371;
          const dLat = toRad(lat - uLat);
          const dLng = toRad(lng - uLng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(uLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
          return 2 * R * Math.asin(Math.sqrt(a));
        };
        const RADIUS_KM = 10;
        strict = strict
          .filter((p) => {
            if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return false;
            return haversine(p.latitude, p.longitude) <= RADIUS_KM;
          })
          .sort((a, b) => haversine(a.latitude, a.longitude) - haversine(b.latitude, b.longitude));
      }

      setProjects((prev) => (append ? [...prev, ...strict] : strict));
      setTotal(count || strict.length);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    }
  };

  const fetchAgents = async (pageNum: number = 1, append: boolean = false) => {
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let queryBuilder = supabase.from("agents").select("*", { count: "exact" });
    if (location) queryBuilder = queryBuilder.or(`name.ilike.%${location}%,cities_served.ilike.%${location}%`);
    const { data, error, count } = await queryBuilder.order("sales_count", { ascending: false }).range(from, to);
    if (!error) {
      setAgents((prev) => (append ? [...prev, ...((data as Agent[]) || [])] : (data as Agent[]) || []));
      setTotal(count || 0);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    }
  };

  const fetchTransactions = async (pageNum: number = 1, append: boolean = false) => {
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let qb = supabase.from("properties").select("*", { count: "exact" }).eq("verified", true).eq("is_live", true);
    qb = applyPropertyFilters(qb);
    const { data, error, count } = await qb.order("price", { ascending: false }).range(from, to);
    if (!error) {
      const rows = ((data as any[]) || []).map(toPublicRow);
      setProperties((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(count || 0);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    }
  };

  const fetchAIDecisions = async () => {
    if (!buyerContext) return;

    const propertyIds = properties
      .map((p) => p.id)
      .sort()
      .join(",");
    const cacheKey = `${user?.id}-${propertyIds}`;

    if (decisionCache.has(cacheKey)) {
      const cached = decisionCache.get(cacheKey)!;
      const decisionMap = new Map<string, PropertyDecision>();
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
        const decisionMap = new Map<string, PropertyDecision>();
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
    const f = advancedFilters;
    if (f.propertyType !== "any") params.set("propertyType", f.propertyType);
    if (f.beds !== "any") params.set("beds", f.beds);
    if (f.bathrooms !== "any") params.set("bathrooms", f.bathrooms);
    if (f.priceMin > 0) params.set("priceMin", String(f.priceMin));
    if (f.priceMax > 0) params.set("priceMax", String(f.priceMax));
    if (f.areaMin > 0) params.set("areaMin", String(f.areaMin));
    if (f.areaMax > 0) params.set("areaMax", String(f.areaMax));
    if (f.furnishing !== "any") params.set("furnishing", f.furnishing);
    if (f.amenities.length > 0) params.set("amenities", f.amenities.join(","));
    if (f.floorLevel !== "any") params.set("floorLevel", f.floorLevel);
    if (f.parkingSpaces !== "any") params.set("parking", f.parkingSpaces);
    if (f.facing !== "any") params.set("facing", f.facing);
    if (f.possessionStatus !== "any") params.set("status", f.possessionStatus);
    if (f.propertyAge !== "any") params.set("age", f.propertyAge);
    if (f.listedBy !== "any") params.set("listedBy", f.listedBy);
    if (f.verifiedOnly) params.set("verified", "1");
    if (f.postedWithin !== "any") params.set("posted", f.postedWithin);
    if (f.reraOnly) params.set("rera", "1");
    if (f.projectName) params.set("projectName", f.projectName);
    if (f.handoverBy !== "any") params.set("handoverBy", f.handoverBy);
    if (f.paymentPlan !== "any") params.set("paymentPlan", f.paymentPlan);
    setSearchParams(params);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
      case "properties":
        return "Featured Properties";
      case "new-projects":
        return "New Projects";
      case "transactions":
        return "Transactions";
      case "agents":
        return "Agents";
      default:
        return "Search";
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
    if (activeTab === "agents") return null;

    const tabs =
      activeTab === "transactions"
        ? [
            { value: "sold", label: "Sold" },
            { value: "rented", label: "Rented" },
          ]
        : [
            { value: "buy", label: "Buy" },
            { value: "rent", label: "Rent" },
          ];

    return (
      <>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSearchType(tab.value)}
            className={`py-2.5 px-6 text-sm font-medium rounded-lg transition-all ${
              searchType === tab.value
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
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
          <EmptyState
            message={savedLocation?.city ? "No properties in this city or locality" : "No properties found"}
          />
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
          <EmptyState message={savedLocation?.city ? "No projects in this city or locality" : "No projects found"} />
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
                  onClick={() => openInNewTab(projectPath(project))}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={project.image || ""}
                      alt={project.name}
                      loading="lazy"
                      decoding="async"
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
                      <span className="line-clamp-1">
                        {project.locality}, {project.city}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div>
                        <span className="text-xs text-muted-foreground">Starting from</span>
                        <p className="text-xl font-bold text-primary">{formatPrice(project.avg_price)}</p>
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
                  onClick={() => openInNewTab(propertyPath(property))}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={property.images?.[0] || "/placeholder.svg"}
                      alt={property.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 bg-green-500 text-white">
                      {searchType === "rented" ? "Rented" : "Sold"}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{(5 + Math.random() * 10).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{property.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {property.locality}, {property.city}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{formatPrice(property.price)}</span>
                      <span className="text-xs text-muted-foreground">{property.area_sqft} sq.ft</span>
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

      <div className="pt-2 pb-2">
        <div className="container-padding max-w-7xl 3xl:max-w-[1680px] mx-auto">
          {/* Location selection screen — shown when the user has no saved location */}
          {!hasLocation && activeTab === "properties" && (
            <div className="mb-10">
              <LocationSelector />
            </div>
          )}

          {/* Search Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h1 className="text-4xl font-bold text-gradient">Search {getTabTitle()}</h1>
              <LocationPill />
            </div>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <p className="text-muted-foreground">
                {getResultCount() > 0
                  ? `Found ${getResultCount()} ${getTabTitle().toLowerCase()}`
                  : `Search for ${getTabTitle().toLowerCase()}`}
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
                    {navItems.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => handleTabChange(item.value)}
                        className={`text-sm font-medium transition-colors relative pb-1.5 flex items-center gap-1.5 ${
                          activeTab === item.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
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

                      {/* Location Input — Google Places autocomplete */}
                      <div className="relative flex-1 min-w-full sm:min-w-[250px]">
                        <InlineLocationSearch
                          variant="box"
                          placeholder="Enter location"
                          initialValue={location}
                          onTextChange={setLocation}
                          onSelected={(loc) => {
                            setLocation(loc.city || loc.locality || "");
                          }}
                          onEnterRaw={() => handleSearch()}
                        />
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
                    {(activeTab === "properties" || activeTab === "transactions" || activeTab === "new-projects") && (
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
                    onClick={() => navigate("/ai-advisor")}
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

          {/* Infinite-scroll sentinel + load-more (Phase 5) */}
          {!loading && hasMore && (
            <InfiniteSentinel
              onReach={() => {
                if (loadingMore) return;
                const next = page + 1;
                setPage(next);
                fetchData(next, true);
              }}
            />
          )}
          {loadingMore && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading more…
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Advanced Filters Sheet (lazy) */}
      {showMoreFilters && (
        <Suspense fallback={null}>
          <AdvancedFiltersSheet
            open={showMoreFilters}
            onOpenChange={setShowMoreFilters}
            activeTab={activeTab}
            searchType={searchType}
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
          />
        </Suspense>
      )}
    </div>
  );
};

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
    <div className="glass-card p-12 max-w-md mx-auto">
      <p className="text-xl text-muted-foreground mb-4">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">Try adjusting your search criteria</p>
    </div>
  </motion.div>
);

// Infinite-scroll sentinel — fires onReach exactly once when it enters the viewport
const InfiniteSentinel = ({ onReach }: { onReach: () => void }) => {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "400px", once: true });
  const fired = useRef(false);
  useEffect(() => {
    if (inView && !fired.current) {
      fired.current = true;
      onReach();
    }
  }, [inView, onReach]);
  return <div ref={ref} className="h-8 w-full" aria-hidden="true" />;
};

export default Search;
