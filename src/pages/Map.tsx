import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import MapFilters from "@/components/map/MapFilters";
import PropertyDrawer from "@/components/map/PropertyDrawer";
import AIAreaLens from "@/components/map/AIAreaLens";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layers, Navigation as Nav3D, Bookmark, Share2, Info, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface Property {
  id: number;
  title: string;
  lat: number;
  lng: number;
  price: number;
  area: number;
  type: string;
  bhk: number;
  verified: boolean;
  images: string[];
  trust_score: number;
  city: string;
  locality: string;
}

const Map = () => {
  const [searchParams] = useSearchParams();
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
  const navigate = useNavigate();
  
  // Initialize filters from URL params
  const getInitialFilters = () => {
    return {
      transactionType: searchParams.get('transactionType') || "buy",
      propertyType: searchParams.get('propertyType') || "all",
      priceRange: searchParams.get('priceRange') ? 
        [1000000, parseInt(searchParams.get('priceRange') || "50000000")] : 
        [1000000, 50000000],
      beds: searchParams.get('beds') || "any",
      verifiedOnly: false,
    };
  };
  
  const [filters, setFilters] = useState(getInitialFilters());

  // Update filters when URL changes
  useEffect(() => {
    const newFilters = getInitialFilters();
    setFilters(newFilters);
    
    // Update city from URL if provided
    const cityParam = searchParams.get('city');
    if (cityParam && (cityParam === 'Hyderabad' || cityParam === 'Vijayawada')) {
      setCurrentCity(cityParam);
    }
    
    // Fetch properties when filters change
    fetchProperties();
  }, [searchParams, currentCity]);

  // City coordinates
  const cityCoordinates = {
    Hyderabad: { lng: 78.4867, lat: 17.385, zoom: 11 },
    Vijayawada: { lng: 80.6480, lat: 16.5062, zoom: 12 },
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRqN3JzNmswMmJ2MmtzN3B3dTRkcjF2In0.5ate8T-GshLvgDb2ByJRDg";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [cityCoordinates[currentCity].lng, cityCoordinates[currentCity].lat],
      zoom: cityCoordinates[currentCity].zoom,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: "metric",
      }),
      "bottom-right"
    );

    // Enable 3D buildings
    map.current.on("load", () => {
      if (!map.current) return;

      // Add 3D building layer
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === "symbol" && layer.layout && layer.layout["text-field"]
      )?.id;

      map.current.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#1a1a2e",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Fetch properties from Supabase
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if database is empty
        const { count } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true });
        
        // If empty, show a message instead of auto-seeding
        if (count === 0) {
          setError("No properties found. Please contact admin to add properties.");
          setIsLoading(false);
        } else {
          await fetchProperties();
        }
      } catch (err) {
        console.error("Error initializing data:", err);
        setError("Failed to load properties. Please try again.");
        setIsLoading(false);
      }
    };

    initializeData();

    // Set up real-time subscription
    const channel = supabase
      .channel("properties-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "properties",
        },
        (payload) => {
          console.log("Property change detected:", payload);
          fetchProperties();
          sonnerToast.success("New property added to map!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
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

  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase.from("properties").select("*");

      // Filter by city
      query = query.eq("city", currentCity);

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

      // Price range filter
      query = query
        .gte("price", filters.priceRange[0])
        .lte("price", filters.priceRange[1]);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to fetch properties. Please try again.");
        return;
      }

      setProperties(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("An error occurred while fetching properties.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add property markers to map
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Group properties for clustering
    const clusterGroups: { [key: string]: Property[] } = {};
    
    properties.forEach((property) => {
      const key = `${Math.round(property.lat * 100)}_${Math.round(property.lng * 100)}`;
      if (!clusterGroups[key]) {
        clusterGroups[key] = [];
      }
      clusterGroups[key].push(property);
    });

    // Add markers for each cluster
    Object.values(clusterGroups).forEach((clusterProps) => {
      if (!map.current) return;

      const property = clusterProps[0];
      const isCluster = clusterProps.length > 1;

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "property-marker";
      el.style.cursor = "pointer";
      el.style.transition = "all 0.2s ease";

      if (isCluster) {
        // Cluster marker
        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.9));
            color: white;
            padding: 12px 16px;
            border-radius: 24px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border: 3px solid white;
            min-width: 60px;
            text-align: center;
          ">
            ${clusterProps.length}
          </div>
        `;
      } else {
        // Single property marker with type icon
        const typeEmoji = property.type?.toLowerCase().includes('villa') ? '🏡' : 
                         property.type?.toLowerCase().includes('plot') ? '📍' :
                         property.type?.toLowerCase().includes('penthouse') ? '🏢' : '🏠';
        
        el.innerHTML = `
          <div style="
            background: ${property.verified 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))'};
            color: white;
            padding: 8px 14px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-size: 14px;">${typeEmoji}</span>
            ₹${(property.price / 100000).toFixed(1)}L
          </div>
        `;
      }

      // Add hover effect
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.1) translateY(-2px)";
        el.style.zIndex = "1000";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.zIndex = "auto";
      });

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.lng, property.lat])
        .addTo(map.current);

      // Add click event
      el.addEventListener("click", () => {
        if (isCluster) {
          // Zoom into cluster
          map.current?.flyTo({
            center: [property.lng, property.lat],
            zoom: map.current.getZoom() + 2,
            duration: 1000,
          });
        } else {
          setSelectedProperty(property);
        }
      });

      // Add popup on hover for single properties
      if (!isCluster) {
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: "property-popup",
        }).setHTML(`
          <div style="padding: 12px; min-width: 220px;">
            <h3 style="font-weight: 600; margin-bottom: 6px; font-size: 14px; line-height: 1.3;">${property.title}</h3>
            <p style="font-size: 18px; color: hsl(var(--primary)); font-weight: 700; margin-bottom: 6px;">₹${(property.price / 100000).toFixed(1)}L</p>
            <p style="font-size: 13px; color: #666; margin-bottom: 4px;">${property.bhk} BHK • ${property.area} sq.ft</p>
            <p style="font-size: 12px; color: #888;">${property.locality}, ${property.city}</p>
            ${property.verified ? '<p style="font-size: 11px; color: #10b981; margin-top: 6px; font-weight: 500;">✓ JaagaX Verified</p>' : ''}
          </div>
        `);

        marker.setPopup(popup);
      }

      markersRef.current.push(marker);
    });
  }, [properties]);

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
  
  // Save current search
  const handleSaveSearch = () => {
    const searchUrl = `${window.location.origin}/map?city=${currentCity}&transactionType=${filters.transactionType}&propertyType=${filters.propertyType}&beds=${filters.beds}&priceRange=${filters.priceRange[1]}`;
    navigator.clipboard.writeText(searchUrl);
    sonnerToast.success("Search URL copied to clipboard!");
  };
  
  // Share current view
  const handleShare = async () => {
    const shareData = {
      title: `Properties in ${currentCity} - JaagaX`,
      text: `Check out ${properties.length} properties in ${currentCity}`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      handleSaveSearch();
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading Skeleton */}
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

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md mx-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <Info className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold">Oops! Something went wrong</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </div>
        </div>
      )}

      {/* Top Filters */}
      <MapFilters
        filters={filters}
        onFiltersChange={setFilters}
        currentCity={currentCity}
        onCityChange={changeCity}
      />

      {/* Control Buttons - Top Right */}
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
          title="Toggle 3D View (Ctrl+3)"
        >
          {is3DMode ? <Nav3D className="h-5 w-5 mr-2" /> : <Layers className="h-5 w-5 mr-2" />}
          <span className="hidden md:inline">{is3DMode ? "3D" : "2D"}</span>
        </Button>
        
        <Button
          onClick={handleSaveSearch}
          variant="outline"
          size="lg"
          className="glass-panel shadow-lg"
          title="Save Search"
        >
          <Bookmark className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={handleShare}
          variant="outline"
          size="lg"
          className="glass-panel shadow-lg"
          title="Share Map"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={() => setShowLegend(!showLegend)}
          variant="outline"
          size="lg"
          className="glass-panel shadow-lg"
          title="Toggle Legend"
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
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-2 border-white" />
                <span>JaagaX Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-full bg-gradient-to-r from-primary to-primary/80 border-2 border-white" />
                <span>Standard Listing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-full bg-gradient-to-r from-primary to-primary/90 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                  5+
                </div>
                <span>Cluster (Multiple)</span>
              </div>
              <div className="pt-2 mt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">🏠 Apartment • 🏡 Villa • 📍 Plot • 🏢 Penthouse</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Area Lens */}
      <AIAreaLens map={map.current} properties={properties} />

      {/* Property Drawer */}
      <AnimatePresence>
        {selectedProperty && (
          <PropertyDrawer
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        )}
      </AnimatePresence>

      {/* Property Count Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div className="glass-panel px-6 py-3 rounded-full shadow-lg">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              <span className="text-primary font-bold">{properties.length}</span>
            </Badge>
            <span className="hidden sm:inline">properties in {currentCity}</span>
            <span className="sm:hidden">found</span>
          </p>
        </div>
      </motion.div>

      {/* Keyboard Shortcuts Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-6 z-10 glass-panel px-4 py-2 rounded-lg text-xs text-muted-foreground hidden lg:block"
      >
        <p>Keyboard: <kbd className="px-1 py-0.5 bg-secondary rounded">ESC</kbd> to close • <kbd className="px-1 py-0.5 bg-secondary rounded">Ctrl+3</kbd> for 3D</p>
      </motion.div>
    </div>
  );
};

export default Map;
