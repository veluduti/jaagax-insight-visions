import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, TrendingUp, Shield, ChevronRight, Map, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useLocation } from "@/contexts/LocationContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Project {
  id: string;
  name: string;
  builder_id: string | null;
  builder_name: string;
  city: string;
  locality: string;
  avg_price: number | null;
  verified: boolean | null;
  trust_score: number | null;
  rera_id: string | null;
  description: string | null;
  image: string | null;
  builder?: {
    name: string;
  };
}

const Projects = () => {
  const navigate = useNavigate();
  const { detectedLocation } = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Filter states - default city to detected location
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [reraOnly, setReraOnly] = useState(false);

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city) {
      const matchedCity = cities.find(
        c => c.toLowerCase() === detectedLocation.city.toLowerCase()
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
      }
    }
  }, [detectedLocation]);

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const cities = ["all", "Hyderabad", "Vijayawada"];
  const projectTypes = ["all", "Residential", "Commercial", "Villa", "Plotted Development"];
  const priceRanges = [
    { label: "All Prices", value: "all" },
    { label: "Under ₹50L", value: "0-5000000" },
    { label: "₹50L - ₹1Cr", value: "5000000-10000000" },
    { label: "₹1Cr - ₹2Cr", value: "10000000-20000000" },
    { label: "Above ₹2Cr", value: "20000000-999999999" },
  ];

  useEffect(() => {
    fetchProjects();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCity, selectedType, selectedPrice, reraOnly, projects]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("verified", true)
        .order("trust_score", { ascending: false });

      if (error) throw error;
      
      // Auto-seed if empty
      if (!data || data.length === 0) {
        const { seedProjects } = await import("@/utils/seedProjects");
        await seedProjects();
        const { data: newData } = await supabase
          .from("projects")
          .select("*")
          .eq("verified", true)
          .order("trust_score", { ascending: false });
        setProjects(newData || []);
        setFilteredProjects(newData || []);
      } else {
        setProjects(data || []);
        setFilteredProjects(data || []);
      }
    } catch (error) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter((p) => p.city === selectedCity);
    }

    // RERA filter
    if (reraOnly) {
      filtered = filtered.filter((p) => p.rera_id !== null && p.rera_id !== '' && p.rera_id.trim() !== '');
    }

    // Price filter
    if (selectedPrice !== "all") {
      const [min, max] = selectedPrice.split("-").map(Number);
      filtered = filtered.filter((p) => p.avg_price >= min && p.avg_price <= max);
    }

    setFilteredProjects(filtered);
  };

  // Initialize map
  useEffect(() => {
    if (viewMode !== "map" || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRqN3JzNmswMmJ2MmtzN3B3dTRkcjF2In0.5ate8T-GshLvgDb2ByJRDg";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [78.4867, 17.385],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [viewMode]);

  // Update map markers
  useEffect(() => {
    if (!map.current || viewMode !== "map") return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Compute bounds to fit all markers
    const bounds = new mapboxgl.LngLatBounds();
    let hasMarkers = false;

    // Add new markers
    filteredProjects.forEach((project: any) => {
      // Skip projects without coordinates
      if (!project.latitude || !project.longitude) return;
      const coords: [number, number] = [project.longitude, project.latitude];

      const el = document.createElement("div");
      el.className = "project-marker";
      
      // Use safe DOM manipulation instead of innerHTML
      const markerDiv = document.createElement("div");
      markerDiv.style.cssText = `
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        white-space: nowrap;
        border: 2px solid white;
      `;
      markerDiv.textContent = `₹${(project.avg_price / 10000000).toFixed(1)}Cr`;
      el.appendChild(markerDiv);

      el.addEventListener("click", () => {
        navigate(`/project/${project.id}`);
      });

      // Create popup content safely
      const popupContainer = document.createElement("div");
      popupContainer.style.padding = "8px";
      
      const titleEl = document.createElement("h3");
      titleEl.style.cssText = "font-weight: 600; margin-bottom: 4px;";
      titleEl.textContent = project.name || '';
      
      const locationEl = document.createElement("p");
      locationEl.style.cssText = "font-size: 12px; color: #666; margin-bottom: 4px;";
      locationEl.textContent = `${project.locality || ''}, ${project.city || ''}`;
      
      const priceEl = document.createElement("p");
      priceEl.style.cssText = "font-size: 14px; font-weight: 600; color: hsl(var(--primary));";
      priceEl.textContent = `₹${(project.avg_price / 10000000).toFixed(2)}Cr`;
      
      popupContainer.appendChild(titleEl);
      popupContainer.appendChild(locationEl);
      popupContainer.appendChild(priceEl);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContainer)
        )
        .addTo(map.current!);

      bounds.extend(coords);
      hasMarkers = true;
      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (hasMarkers) {
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
    }
  }, [filteredProjects, viewMode, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            Verified <span className="text-gradient">Projects</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore premium projects from India's top builders
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 mb-8 rounded-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city === "all" ? "All Cities" : city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Types" : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPrice} onValueChange={setSelectedPrice}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                {priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={reraOnly ? "default" : "outline"}
              onClick={() => setReraOnly(!reraOnly)}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              RERA Verified
            </Button>

            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              className="w-full"
            >
              {viewMode === "list" ? (
                <>
                  <Map className="h-4 w-4 mr-2" />
                  Map View
                </>
              ) : (
                <>
                  <List className="h-4 w-4 mr-2" />
                  List View
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-6 text-muted-foreground">
          Found <span className="text-primary font-semibold">{filteredProjects.length}</span> projects
        </div>

        {/* Projects Grid or Map View */}
        {viewMode === "map" ? (
          <div className="flex gap-6 h-[calc(100vh-400px)] min-h-[600px]">
            {/* Projects List */}
            <div className="w-[45%] overflow-y-auto pr-4 space-y-4 scrollbar-thin">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={i} className="glass-panel h-48 animate-pulse" />
                ))
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {reraOnly ? `No RERA verified projects available${selectedCity ? ` in ${selectedCity}` : ''}` : "No projects found"}
                  </h3>
                  <p className="text-muted-foreground">
                    {reraOnly ? "Try removing the RERA filter to see all projects" : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="flex gap-4 p-4">
                      {/* Image */}
                      <div className="relative w-48 h-36 flex-shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={project.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800"}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {project.rera_id && (
                          <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground border-0 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            RERA
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 line-clamp-1">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{project.builder_name}</p>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          {project.locality}, {project.city}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">Starting from</span>
                            <p className="text-xl font-bold text-primary">
                              ₹{(project.avg_price / 10000000).toFixed(2)}Cr
                            </p>
                          </div>
                          {project.trust_score > 80 && (
                            <Badge variant="outline" className="border-primary/50">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {project.trust_score}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Map */}
            <div className="flex-1 relative rounded-xl overflow-hidden border border-border">
              <div ref={mapContainer} className="w-full h-full" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
                onClick={() => setViewMode("list")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Switch to Listings View
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-panel h-96 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {reraOnly ? `No RERA verified projects available${selectedCity ? ` in ${selectedCity}` : ''}` : "No projects found"}
            </h3>
            <p className="text-muted-foreground">
              {reraOnly ? "Try removing the RERA filter to see all projects" : "Try adjusting your filters"}
            </p>
            {reraOnly && (
              <Button variant="outline" className="mt-4" onClick={() => setReraOnly(false)}>
                Show All Projects
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 h-full"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={project.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800"}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    
                    {/* Badges */}
                    {project.rera_id && (
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                        <Shield className="h-3 w-3 mr-1" />
                        RERA Verified
                      </Badge>
                    )}

                    {project.trust_score > 80 && (
                      <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border-primary/50">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Trust Score: {project.trust_score}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
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

                    <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {project.locality}, {project.city}
                    </div>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Starting from</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{(project.avg_price / 10000000).toFixed(2)}Cr
                      </span>
                    </div>

                    <Button variant="outline" className="w-full border-primary/50 hover:bg-primary/10 group">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Projects;
