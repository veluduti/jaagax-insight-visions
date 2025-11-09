import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, TrendingUp, Shield, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  builder_id: number;
  builder_name: string;
  city: string;
  locality: string;
  avg_price: number;
  verified: boolean;
  trust_score: number;
  rera_id: string | null;
  overview: string | null;
  image: string | null;
  builder?: {
    name: string;
  };
}

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [reraOnly, setReraOnly] = useState(false);

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
      
      setProjects(data || []);
      setFilteredProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
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
      filtered = filtered.filter((p) => p.rera_id !== null);
    }

    // Price filter
    if (selectedPrice !== "all") {
      const [min, max] = selectedPrice.split("-").map(Number);
      filtered = filtered.filter((p) => p.avg_price >= min && p.avg_price <= max);
    }

    setFilteredProjects(filtered);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-6 text-muted-foreground">
          Found <span className="text-primary font-semibold">{filteredProjects.length}</span> projects
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-panel h-96 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
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
