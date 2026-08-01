import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import BuilderTrustBadges from "@/components/home/BuilderTrustBadges";
import { canonicalizeCity, isSameCity } from "@/lib/cityNormalizer";

interface Project {
  id: string;
  slug?: string | null;
  name: string;
  builder_name: string;
  city: string;
  locality: string;
  avg_price: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_per_sqft?: number | null;
  image: string | null;
  verified: boolean | null;
  rera_id: string | null;
  trust_score: number | null;
}

const formatINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const formatProjectPrice = (p: Project) => {
  const value = [p.price_min, p.avg_price, p.price_max].find(
    (v) => typeof v === "number" && v > 0,
  ) as number | undefined;
  return value ? formatINR(value) : "Price on Request";
};

const openProject = (p: { slug?: string | null; id: string }) => {
  window.open(`/project/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface NewProjectsProps {
  detectedCity?: string;
}

const NewProjects = ({ detectedCity }: NewProjectsProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [detectedCity]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log("[NewProjects] Selected city:", detectedCity);

      let query = (supabase
        .from("projects" as any)
        .select("*") as any)
        .eq("verified", true)
        .not("name", "is", null)
        .not("city", "is", null)
        .not("locality", "is", null);

      const { data, error } = await query
        .order("trust_score", { ascending: false })
        .limit(80);

      if (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }

      // Strict client-side guard against city leakage.
      const normalizedCity = canonicalizeCity(detectedCity);

      const filtered = ((data as any[]) || [])
        .filter((p) => !detectedCity || isSameCity(p.city, normalizedCity))
        .slice(0, 6);

      console.log(`[NewProjects] Filtered projects: ${filtered.length}`, filtered.map((p) => p.city));

      // NO cross-city fallback — strict location filtering.
      setProjects(filtered);
    } catch (error) {
      console.error("Error in fetchProjects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <section className="py-16 relative bg-secondary/20" id="new-projects">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="py-16 relative bg-secondary/20" id="new-projects">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              New <span className="text-gradient">Projects</span>
              {detectedCity && <span className="text-foreground/60 text-2xl"> in {detectedCity}</span>}
            </h2>
            <p className="text-foreground/70 text-lg mb-8">
              {detectedCity ? "No properties available in this location yet." : "No new projects available at the moment. Check back soon!"}
            </p>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => navigate('/projects')}
            >
              Explore All Projects
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 relative bg-secondary/20" id="new-projects">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            New <span className="text-gradient">Projects</span>
            {detectedCity && <span className="text-foreground/60 text-2xl"> in {detectedCity}</span>}
          </h2>
          <p className="text-foreground/70 text-lg">
            {detectedCity ? `Upcoming projects near your location` : 'Explore upcoming projects from India\'s top builders'}
          </p>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4 items-stretch">
            {projects.map((project, index) => (
              <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3 flex h-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="h-full w-full"
                >
                  <Card 
                    className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 h-full flex flex-col"
                    onClick={() => openProject(project)}
                  >
                    {/* Image — fixed height for uniform card sizing */}
                    <div className="relative h-56 overflow-hidden flex-shrink-0 bg-muted">
                      {project.image ? (
                        <img
                          src={project.image}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }} loading="lazy" decoding="async" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                      
                      {/* RERA Badge */}
                      {project.rera_id && (
                        <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                          RERA Verified
                        </Badge>
                      )}

                      {/* Verified Badge */}
                      {project.verified && (
                        <Badge className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm border border-primary/50 text-foreground hover:bg-background">
                          <TrendingUp className="h-3 w-3 mr-1 text-primary" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {/* Content — flex column so button pins to bottom */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.builder_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{project.locality}, {project.city}</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Starting From</span>
                          <span className="font-semibold text-primary">
                            {formatProjectPrice(project)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-semibold">{project.city}</span>
                        </div>
                      </div>

                      {/* Builder Trust Badges */}
                      <div className="mb-4">
                        <BuilderTrustBadges
                          verified={project.verified}
                          reraId={project.rera_id}
                          builderName={project.builder_name}
                        />
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full border-primary/50 hover:bg-primary/10 mt-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProject(project);
                        }}
                      >
                        Explore Project
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 -translate-x-1/2" />
          <CarouselNext className="right-0 translate-x-1/2" />
        </Carousel>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/10"
            onClick={() => navigate('/projects')}
          >
            Explore All Projects
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default NewProjects;
