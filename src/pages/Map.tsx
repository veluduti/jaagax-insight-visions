import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import MapFilters from "@/components/map/MapFilters";
import PropertyDrawer from "@/components/map/PropertyDrawer";
import AIAreaLens from "@/components/map/AIAreaLens";
import { Button } from "@/components/ui/button";
import { Layers, Navigation as Nav3D, Database, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { seedProperties } from "@/utils/seedProperties";
import { seedAgents } from "@/utils/seedAgents";
import { seedProjects } from "@/utils/seedProjects";
import { seedComprehensiveProperties, clearAllData } from "@/utils/comprehensiveSeedProperties";
import { toast as sonnerToast } from "sonner";
import { quickSeedData } from "@/utils/quickSeed";

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [currentCity, setCurrentCity] = useState<"Hyderabad" | "Vijayawada">("Hyderabad");
  const [isSeeding, setIsSeeding] = useState(false);
  const [filters, setFilters] = useState({
    transactionType: "buy",
    propertyType: "all",
    priceRange: [1000000, 50000000],
    beds: "any",
    verifiedOnly: false,
  });

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
      // Check if database is empty
      const { count } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true });
      
      // Auto-seed if empty
      if (count === 0) {
        console.log("Database is empty, auto-seeding...");
        await handleQuickSeed();
      } else {
        fetchProperties();
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
          toast({
            title: "New listing!",
            description: "A new property has been added to the map.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProperties = async () => {
    let query = supabase.from("properties").select("*");

    if (filters.verifiedOnly) {
      query = query.eq("verified", true);
    }

    if (filters.propertyType !== "all") {
      query = query.eq("type", filters.propertyType as any);
    }

    if (filters.beds !== "any") {
      query = query.eq("bhk", parseInt(filters.beds));
    }

    query = query
      .gte("price", filters.priceRange[0])
      .lte("price", filters.priceRange[1]);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching properties:", error);
      return;
    }

    setProperties(data || []);
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
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            border: 3px solid white;
            min-width: 60px;
            text-align: center;
          ">
            ${clusterProps.length}
          </div>
        `;
      } else {
        // Single property marker
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
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            border: 2px solid white;
            white-space: nowrap;
          ">
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

  // Seed properties
  const handleSeedProperties = async () => {
    setIsSeeding(true);
    try {
      const result = await seedProperties();
      
      if (result.success) {
        if (result.message === "Properties already exist") {
          sonnerToast.info("Properties already seeded!");
        } else {
          sonnerToast.success("Successfully added 10 properties!");
          fetchProperties();
        }
      } else {
        sonnerToast.error(`Failed: ${result.error?.message || 'Unknown error'}`);
        console.error("Seed error:", result.error);
      }
    } catch (err) {
      sonnerToast.error("Error seeding properties");
      console.error(err);
    }
    setIsSeeding(false);
  };

  // Seed agents
  const handleSeedAgents = async () => {
    setIsSeeding(true);
    try {
      const result = await seedAgents();
      
      if (result.success) {
        if (result.message === "Agents already exist") {
          sonnerToast.info("Agents already seeded!");
        } else {
          sonnerToast.success("Successfully added 5 agents!");
        }
      } else {
        sonnerToast.error(`Failed: ${result.error?.message || 'Unknown error'}`);
        console.error("Seed error:", result.error);
      }
    } catch (err) {
      sonnerToast.error("Error seeding agents");
      console.error(err);
    }
    setIsSeeding(false);
  };

  // Seed projects
  const handleSeedProjects = async () => {
    setIsSeeding(true);
    try {
      const result = await seedProjects();
      
      if (result.success) {
        if (result.message === "Projects already exist") {
          sonnerToast.info("Projects already seeded!");
        } else {
          sonnerToast.success("Successfully added projects!");
        }
      } else {
        sonnerToast.error(`Failed: ${result.error?.message || 'Unknown error'}`);
        console.error("Seed error:", result.error);
      }
    } catch (err) {
      sonnerToast.error("Error seeding projects");
      console.error(err);
    }
    setIsSeeding(false);
  };

  // Seed all comprehensive data
  const handleSeedComprehensive = async () => {
    setIsSeeding(true);
    try {
      const result = await seedComprehensiveProperties();
      
      if (result.success) {
        if (result.message === "Properties already exist") {
          sonnerToast.info("Comprehensive data already seeded!");
        } else {
          sonnerToast.success("Successfully seeded 20+ properties!");
          fetchProperties();
        }
      } else {
        sonnerToast.error(`Failed: ${result.error?.message || 'Unknown error'}`);
        console.error("Seed error:", result.error);
      }
    } catch (err) {
      sonnerToast.error("Error seeding comprehensive data");
      console.error(err);
    }
    setIsSeeding(false);
  };

  // Quick seed for testing
  const handleQuickSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await quickSeedData();
      
      if (result.success) {
        sonnerToast.success(`✅ Seeded ${result.count} properties!`);
        fetchProperties();
      } else {
        sonnerToast.error(`Failed: ${result.error?.message || 'Unknown error'}`);
        console.error("Seed error:", result.error);
      }
    } catch (err) {
      sonnerToast.error("Error with quick seed");
      console.error(err);
    }
    setIsSeeding(false);
  };

  // Clear all data
  const handleClearData = async () => {
    setIsSeeding(true);
    try {
      const result = await clearAllData();
      
      if (result.success) {
        sonnerToast.success("All data cleared successfully!");
        fetchProperties();
      } else {
        sonnerToast.error("Failed to clear data");
      }
    } catch (err) {
      sonnerToast.error("Error clearing data");
      console.error(err);
    }
    setIsSeeding(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top Filters */}
      <MapFilters
        filters={filters}
        onFiltersChange={setFilters}
        currentCity={currentCity}
        onCityChange={changeCity}
      />

      {/* Control Buttons */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-24 right-6 z-10 flex flex-col gap-3"
      >
        <Button
          onClick={toggle3DMode}
          variant={is3DMode ? "default" : "outline"}
          size="lg"
          className="glass-panel glow-effect"
        >
          {is3DMode ? <Nav3D className="h-5 w-5 mr-2" /> : <Layers className="h-5 w-5 mr-2" />}
          {is3DMode ? "3D View" : "2D View"}
        </Button>
        
        <div className="glass-panel p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Seed Data:</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleQuickSeed}
              variant="default"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <Database className="h-4 w-4" />
              {isSeeding ? "..." : "Quick (10) ⚡"}
            </Button>

            <Button
              onClick={handleSeedComprehensive}
              variant="default"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2 bg-primary"
            >
              <Database className="h-4 w-4" />
              {isSeeding ? "..." : "All (20+)"}
            </Button>

            <Button
              onClick={handleSeedProperties}
              variant="outline"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2"
            >
              <Database className="h-4 w-4" />
              {isSeeding ? "..." : "Properties (10)"}
            </Button>

            <Button
              onClick={handleSeedAgents}
              variant="outline"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2"
            >
              <Users className="h-4 w-4" />
              {isSeeding ? "..." : "Agents (13)"}
            </Button>

            <Button
              onClick={handleSeedProjects}
              variant="outline"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2"
            >
              <Building2 className="h-4 w-4" />
              {isSeeding ? "..." : "Projects (18)"}
            </Button>

            <Button
              onClick={handleClearData}
              variant="destructive"
              size="sm"
              disabled={isSeeding}
              className="w-full gap-2 mt-2"
            >
              {isSeeding ? "..." : "Clear All"}
            </Button>
          </div>
        </div>
      </motion.div>

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
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 glass-panel px-6 py-3 rounded-full"
      >
        <p className="text-sm font-semibold">
          <span className="text-primary">{properties.length}</span> properties found
        </p>
      </motion.div>
    </div>
  );
};

export default Map;
