import { useState, useEffect, useRef } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import MapFilters from "@/components/map/MapFilters";
import PropertyDrawer from "@/components/map/PropertyDrawer";
import AIAreaLens from "@/components/map/AIAreaLens";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Navigation as Nav3D,
  Bookmark,
  Share2,
  Info,
  ChevronDown,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Home,
  Bed,
  Bath,
  Maximize,
  X,
  MapPin,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface Property {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  area_sqft: number | null;
  type: string | null;
  bhk: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  verified: boolean | null;
  images: any;
  trust_score: number | null;
  city: string | null;
  locality: string | null;
  status: string;
  is_live: boolean;
}

const Map = () => {
  const [searchParams] = useSearchParams();
  const { detectedLocation } = useLocationContext();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [currentCity, setCurrentCity] = useState<"Hyderabad" | "Vijayawada">("Hyderabad");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAILens, setShowAILens] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const navigate = useNavigate();

  // City coordinates
  const cityCoordinates = {
    Hyderabad: { lng: 78.4867, lat: 17.385, zoom: 11 },
    Vijayawada: { lng: 80.648, lat: 16.5062, zoom: 12 },
  };

  // Get Mapbox token
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city) {
      const city = detectedLocation.city;
      if (city === "Hyderabad" || city === "Vijayawada") {
        setCurrentCity(city);
      }
    }
  }, [detectedLocation]);

  // Initialize filters from URL params
  const getInitialFilters = () => ({
    transactionType: searchParams.get("transactionType") || "buy",
    propertyType: searchParams.get("propertyType") || "all",
    priceRange: searchParams.get("priceRange")
      ? [1000000, parseInt(searchParams.get("priceRange") || "50000000")]
      : [1000000, 50000000],
    beds: searchParams.get("beds") || "any",
    verifiedOnly: false,
    locality: undefined as string | undefined,
  });

  const [filters, setFilters] = useState(getInitialFilters());

  // Update filters when URL changes
  useEffect(() => {
    const newFilters = getInitialFilters();
    setFilters(newFilters);
    const cityParam = searchParams.get("city");
    if (cityParam && (cityParam === "Hyderabad" || cityParam === "Vijayawada")) {
      setCurrentCity(cityParam);
    }
  }, [searchParams]);

  // Refetch whenever filters or city change
  useEffect(() => {
    if (mapLoaded) {
      fetchProperties();
    }
  }, [filters, currentCity, mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check for Mapbox token
    if (!mapboxToken) {
      setError("Mapbox token missing. Please add VITE_MAPBOX_PUBLIC_TOKEN to your .env file.");
      setIsLoading(false);
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [cityCoordinates[currentCity].lng, cityCoordinates[currentCity].lat],
        zoom: cityCoordinates[currentCity].zoom,
        pitch: 0,
        bearing: 0,
      });

      map.current = mapInstance;

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

      mapInstance.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");

      // Handle map load
      mapInstance.on("load", () => {
        setMapLoaded(true);
        setIsLoading(false);

        // Add 3D building layer
        const layers = mapInstance.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === "symbol" && layer.layout && layer.layout["text-field"],
        )?.id;

        mapInstance.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#1a1a2e",
              "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "height"]],
              "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "min_height"]],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId,
        );

        // Fetch properties after map loads
        fetchProperties();
      });

      // Handle errors
      mapInstance.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Failed to load map. Please check your Mapbox token.");
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Failed to initialize map. Please try again.");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Fetch properties from Supabase
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from("properties").select("*");

      // Filter by city
      query = query.ilike("city", currentCity);

      if (filters.verifiedOnly) {
        query = query.eq("verified", true);
      }

      if (filters.propertyType !== "all") {
        query = query.ilike("type", `%${filters.propertyType}%`);
      }

      if (filters.beds !== "any") {
        const bedsNum = parseInt(filters.beds);
        if (bedsNum === 4) {
          query = query.gte("bhk", 4);
        } else {
          query = query.eq("bhk", bedsNum);
        }
      }

      if (filters.locality) {
        query = query.ilike("locality", `%${filters.locality}%`);
      }

      query = query.gte("price", filters.priceRange[0]).lte("price", filters.priceRange[1]).eq("is_live", true);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to fetch properties. Please try again.");
        return;
      }

      const processedData = (data || []).map((row: any) => {
        const v = getPublicPropertyView(row);
        if (!v) return row;
        return {
          ...row,
          title: v.title,
          city: v.city ?? row.city,
          locality: v.locality ?? row.locality,
          price: v.price ?? row.price,
          area_sqft: v.area_sqft ?? row.area_sqft,
          bhk: v.bhk ?? row.bhk,
          bedrooms: v.bedrooms ?? row.bedrooms,
          bathrooms: v.bathrooms ?? row.bathrooms,
          type: v.type ?? row.type,
          images: v.images?.length ? v.images : row.images,
        };
      });

      setProperties(processedData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("An error occurred while fetching properties.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add property markers to map
  useEffect(() => {
    if (!map.current || !mapLoaded || isLoading) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (properties.length === 0) return;

    // Add markers
    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      // Create marker element
      const el = document.createElement("div");
      el.className = "property-marker";
      el.style.cursor = "pointer";

      const inner = document.createElement("div");
      inner.style.cssText = `
        background: ${
          property.verified ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #2563EB, #1D4ED8)"
        };
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid white;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: transform 0.2s ease;
      `;
      inner.textContent = `₹${(property.price / 100000).toFixed(1)}L`;

      // Hover effect
      el.addEventListener("mouseenter", () => {
        inner.style.transform = "scale(1.1) translateY(-2px)";
        el.style.zIndex = "1000";
      });
      el.addEventListener("mouseleave", () => {
        inner.style.transform = "scale(1)";
        el.style.zIndex = "auto";
      });

      el.appendChild(inner);

      // Create marker
      const marker = new mapboxgl.Marker(el).setLngLat([property.longitude, property.latitude]).addTo(map.current!);

      // Click to open property
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelectedProperty(property);
      });

      markersRef.current.push(marker);
    });
  }, [properties, mapLoaded, isLoading]);

  // Toggle 3D mode
  const toggle3DMode = () => {
    if (!map.current) return;
    if (is3DMode) {
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    } else {
      map.current.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
    }
    setIs3DMode(!is3DMode);
  };

  // Change city
  const changeCity = (city: "Hyderabad" | "Vijayawada") => {
    if (!map.current) return;
    const coords = cityCoordinates[city];
    map.current.flyTo({
      center: [coords.lng, coords.lat],
      zoom: coords.zoom,
      duration: 2000,
    });
    setCurrentCity(city);
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L`;
    return `₹${price.toLocaleString()}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedProperty) {
        setSelectedProperty(null);
      }
      if (e.key === "3" && e.ctrlKey) {
        e.preventDefault();
        toggle3DMode();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedProperty, is3DMode]);

  // Handle save search
  const handleSaveSearch = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      sonnerToast.error("Please sign in to save searches");
      navigate("/auth");
      return;
    }
    const defaultName = `${filters.beds !== "any" ? filters.beds + " BHK " : ""}${filters.propertyType !== "any" ? filters.propertyType + " " : ""}in ${currentCity}`;
    const name = window.prompt("Name this search:", defaultName.trim());
    if (!name) return;

    const filtersJson = {
      city: currentCity,
      transactionType: filters.transactionType,
      propertyType: filters.propertyType,
      bhk: filters.beds,
      priceMin: filters.priceRange?.[0],
      priceMax: filters.priceRange?.[1],
    };

    const { error } = await (supabase as any).from("saved_searches").insert({
      user_id: user.id,
      name,
      filters: filtersJson,
      alerts_enabled: true,
      last_count: properties.length,
    });

    if (error) {
      sonnerToast.error("Failed to save search");
      return;
    }
    sonnerToast.success("Search saved!");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Info className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold">Map Error</h3>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="flex-1">
              Reload
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/buyer")} className="flex-1">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-panel p-8 rounded-2xl space-y-4 max-w-md mx-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <p className="text-sm text-muted-foreground text-center">Loading properties...</p>
          </div>
        </div>
      )}

      {/* Top Left - Back + Filter Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20 flex gap-2"
      >
        <Button
          onClick={() => navigate("/dashboard/buyer")}
          variant="outline"
          size="lg"
          className="glass-panel shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">Back</span>
        </Button>
        {!showFilters && (
          <Button onClick={() => setShowFilters(true)} variant="outline" size="lg" className="glass-panel shadow-lg">
            <SlidersHorizontal className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">Filters</span>
          </Button>
        )}
        {!showAILens && (
          <Button
            onClick={() => setShowAILens(true)}
            variant="outline"
            size="lg"
            className="glass-panel shadow-lg glow-effect"
          >
            <Sparkles className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">AI Lens</span>
          </Button>
        )}
      </motion.div>

      {/* Top Right Controls */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 right-6 z-10 flex flex-col gap-3"
      >
        <Button
          onClick={toggle3DMode}
          variant={is3DMode ? "default" : "outline"}
          size="lg"
          className="glass-panel shadow-lg"
        >
          {is3DMode ? <Nav3D className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
        </Button>
        <Button onClick={handleSaveSearch} variant="outline" size="lg" className="glass-panel shadow-lg">
          <Bookmark className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => setShowLegend(!showLegend)}
          variant="outline"
          size="lg"
          className="glass-panel shadow-lg"
        >
          <Info className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-80 right-6 z-10 glass-panel p-4 rounded-xl shadow-lg max-w-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Map Legend</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowLegend(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-2 border-white" />
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-white" />
                <span>Standard</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Area Lens */}
      {showAILens && (
        <AIAreaLens
          map={map.current}
          properties={properties}
          currentCity={currentCity}
          onClose={() => setShowAILens(false)}
        />
      )}

      {/* Property Drawer - Clicking marker opens this */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-full sm:w-[420px] z-30 bg-background border-l shadow-2xl"
          >
            <div className="h-full overflow-y-auto p-6">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={() => setSelectedProperty(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Property Image */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                <img
                  src={
                    selectedProperty.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"
                  }
                  alt={selectedProperty.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";
                  }}
                />
                {selectedProperty.verified && <Badge className="absolute top-3 left-3 bg-green-500">✓ Verified</Badge>}
              </div>

              {/* Property Details */}
              <h2 className="text-xl font-bold mb-1">{selectedProperty.title}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                <MapPin className="h-3.5 w-3.5" />
                {selectedProperty.locality}, {selectedProperty.city}
              </p>

              <p className="text-2xl font-bold text-primary mb-4">{formatPrice(selectedProperty.price)}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Bed className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-semibold">{selectedProperty.bhk || selectedProperty.bedrooms || 0} BHK</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Bath className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-semibold">{selectedProperty.bathrooms || 0} Baths</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Maximize className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-semibold">{selectedProperty.area_sqft || 0} sq.ft</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    window.open(`/property/${selectedProperty.id}`, "_blank");
                  }}
                >
                  <Home className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate(`/visit/schedule?propertyId=${selectedProperty.id}`);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Visit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Property Count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div className="glass-panel px-6 py-3 rounded-full shadow-lg">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {properties.length}
            </Badge>
            <span className="hidden sm:inline">properties in {currentCity}</span>
            <span className="sm:hidden">found</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Map;
