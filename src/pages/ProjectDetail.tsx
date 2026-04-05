import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Home,
  Dumbbell,
  TreePine,
  Car,
  Waves,
  Users,
  Video,
  Loader2,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SiteVisitBookingModal } from "@/components/booking/SiteVisitBookingModal";
import { InterestRegistrationModal } from "@/components/booking/InterestRegistrationModal";
import { BuilderTrustProgram } from "@/components/builder/BuilderTrustProgram";

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
  images: string[] | null;
  amenities: string[] | null;
  bhk_types: string | null;
  area_range: string | null;
  status: string | null;
  possession_date: string | null;
  overview?: string;
}

interface Amenity {
  id: string;
  type: string;
  status: string;
}

interface Unit {
  id: string;
  bhk: number;
  area: number;
  price: number;
  facing: string | null;
  plan_svg: string | null;
  plan_3d: string | null;
}

const amenityIcons: Record<string, any> = {
  gym: Dumbbell,
  pool: Waves,
  park: TreePine,
  parking: Car,
  clubhouse: Users,
  security: Shield,
  default: Home,
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Validate ID parameter
  useEffect(() => {
    if (!id) {
      toast.error("Invalid project ID");
      navigate("/projects");
    }
  }, [id, navigate]);
  const [project, setProject] = useState<Project | null>(null);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [specifications, setSpecifications] = useState<any>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [selected3DPlan, setSelected3DPlan] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);

  const galleryImages = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  ];

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("verified", true)
        .maybeSingle();

      if (projectError) throw projectError;
      
      if (!projectData) {
        setProject(null);
        setLoading(false);
        return;
      }
      
      // Validate critical fields
      if (!projectData.name || !projectData.city || !projectData.locality) {
        setProject(null);
        setLoading(false);
        return;
      }
      
      setProject(projectData);

      // Use amenities from project table directly
      if (projectData.amenities && projectData.amenities.length > 0) {
        const amenityIconMap: Record<string, string> = {
          'Swimming Pool': 'pool', 'Infinity Pool': 'pool', 'Olympic Pool': 'pool', 'Rooftop Pool': 'pool',
          'Gymnasium': 'gym', 'Fitness Center': 'gym',
          'Clubhouse': 'clubhouse', 'Party Hall': 'clubhouse', 'Community Hall': 'clubhouse', 'Banquet Hall': 'clubhouse',
          'Landscaped Gardens': 'park', 'Garden': 'park', 'Rooftop Garden': 'park', 'Pet Park': 'park', 'Senior Citizen Park': 'park',
          'Covered Parking': 'parking', 'Valet Parking': 'parking',
          '24/7 Security': 'security',
        };
        setAmenities(projectData.amenities.map((name: string, i: number) => ({
          id: String(i),
          type: amenityIconMap[name] || 'default',
          name,
          status: 'Available',
        })));
      }

      // Generate highlights from available project data
      const autoHighlights: string[] = [];
      if (projectData.bhk_types) autoHighlights.push(`Available in ${projectData.bhk_types} configurations`);
      if (projectData.area_range) autoHighlights.push(`Unit sizes: ${projectData.area_range}`);
      if (projectData.status) autoHighlights.push(`Status: ${projectData.status}`);
      if (projectData.possession_date) autoHighlights.push(`Possession: ${projectData.possession_date}`);
      if (projectData.rera_id) autoHighlights.push('RERA approved project');
      if (projectData.builder_name) autoHighlights.push(`Developed by ${projectData.builder_name}`);
      autoHighlights.push('Premium location with excellent connectivity');
      if (projectData.amenities?.length) autoHighlights.push(`${projectData.amenities.length}+ world-class amenities`);
      setHighlights(autoHighlights);

      // Try fetching enriched data (floor plans, specs) from edge function - non-blocking
      try {
        const { data: webData, error: webError } = await supabase.functions.invoke(
          "fetch-project-web-data",
          { body: { projectId: projectData.id } }
        );
        if (!webError && webData?.success) {
          if (webData.data.overview) {
            setProject((prev) => prev ? { ...prev, overview: webData.data.overview } : prev);
          }
          if (webData.data.floorPlans?.length > 0) {
            setUnits(webData.data.floorPlans);
          }
          if (webData.data.specifications && Object.keys(webData.data.specifications).length > 0) {
            setSpecifications(webData.data.specifications);
          }
        }
      } catch (enrichErr) {
        console.log("Enrichment data not available, using project table data");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Project not found");
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (!project) return;
    
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-project-summary", {
        body: {
          projectData: project,
          amenities,
          units,
        },
      });

      if (error) throw error;

      if (data?.fallback) {
        // Use fallback summary if AI service is unavailable
        setAiSummary(
          `${project.name} is a premium ${project.city}-based development by ${project.builder_name || "a renowned builder"}. ` +
          `Located in ${project.locality}, this project offers modern living spaces with world-class amenities. ` +
          `With a trust score of ${project.trust_score}/100 and ${project.rera_id ? "RERA certification" : "ongoing verification"}, ` +
          `this project represents excellent value starting from ₹${(project.avg_price / 10000000).toFixed(2)} Crores. ` +
          `The development features ${amenities.length} premium amenities including modern fitness facilities, landscaped gardens, and 24/7 security.`
        );
        toast.info(data.error || "Using fallback summary");
      } else {
        setAiSummary(data.summary);
        toast.success("AI summary generated!");
      }
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast.error("Failed to generate AI summary");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <Navigation />
        <div className="container mx-auto px-6 py-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <Navigation />
        <div className="container mx-auto px-6 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Button onClick={() => navigate("/projects")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const AmenityIcon = amenityIcons[project.name] || amenityIcons.default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{project.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{project.locality}, {project.city}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Starting from</p>
              <p className="text-3xl font-bold text-primary">
                ₹{(project.avg_price / 10000000).toFixed(2)}Cr
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {project.rera_id && (
              <Badge variant="default" className="bg-primary/90">
                <Shield className="h-3 w-3 mr-1" />
                RERA: {project.rera_id}
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/50">
              Trust Score: {project.trust_score}/100
            </Badge>
            <Badge variant="secondary">
              By {project.builder_name || "Builder"}
            </Badge>
          </div>
        </motion.div>

        {/* Gallery Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Carousel className="w-full">
            <CarouselContent>
              {galleryImages.map((image, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="relative h-64 rounded-xl overflow-hidden">
                    <img
                      src={image}
                      alt={`${project.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </motion.div>

        {/* Tabs Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="builder" className="gap-1">
                <Award className="h-3 w-3" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="floorplans">Floor Plans</TabsTrigger>
              <TabsTrigger value="ai">AI Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Project Quick Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {project.builder_name && (
                      <div className="p-4 rounded-lg bg-accent/10 border border-border/50 text-center">
                        <Building2 className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Builder</p>
                        <p className="font-semibold text-sm">{project.builder_name}</p>
                      </div>
                    )}
                    {project.bhk_types && (
                      <div className="p-4 rounded-lg bg-accent/10 border border-border/50 text-center">
                        <Home className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Configurations</p>
                        <p className="font-semibold text-sm">{project.bhk_types}</p>
                      </div>
                    )}
                    {project.area_range && (
                      <div className="p-4 rounded-lg bg-accent/10 border border-border/50 text-center">
                        <Building2 className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Area Range</p>
                        <p className="font-semibold text-sm">{project.area_range}</p>
                      </div>
                    )}
                    {project.status && (
                      <div className="p-4 rounded-lg bg-accent/10 border border-border/50 text-center">
                        <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold text-sm">{project.status}</p>
                      </div>
                    )}
                    {project.possession_date && (
                      <div className="p-4 rounded-lg bg-accent/10 border border-border/50 text-center">
                        <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Possession</p>
                        <p className="font-semibold text-sm">{project.possession_date}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {project.description ||
                        `${project.name} is a premium residential project located in the heart of ${project.locality}, ${project.city}. 
                        Developed by ${project.builder_name || "a renowned builder"}, this project offers modern living spaces with 
                        world-class amenities and excellent connectivity to major landmarks.`}
                    </p>
                  </div>

                  {highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Key Highlights</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {specifications && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(specifications).map(([key, value]) => (
                          <div key={key} className="p-3 rounded-lg bg-accent/10 border border-border/50">
                            <p className="text-sm text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="font-medium mt-1">{value as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Builder Trust Program Tab */}
            <TabsContent value="builder">
              {project.builder_id ? (
                <BuilderTrustProgram 
                  builderId={project.builder_id} 
                  builderName={project.builder_name}
                />
              ) : project.builder_name ? (
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {project.builder_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {project.builder_name} is the developer of {project.name}, located in {project.locality}, {project.city}.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {project.status && (
                        <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                          <p className="text-xs text-muted-foreground">Project Status</p>
                          <p className="font-semibold">{project.status}</p>
                        </div>
                      )}
                      {project.possession_date && (
                        <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                          <p className="text-xs text-muted-foreground">Possession</p>
                          <p className="font-semibold">{project.possession_date}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-panel">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Builder information not available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="amenities">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Premium Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  {amenities.length === 0 ? (
                    <p className="text-muted-foreground">No amenities information available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {amenities.map((amenity, index) => {
                        const amenityType = amenity.type?.toLowerCase() || 'default';
                        const Icon = amenityIcons[amenityType] || amenityIcons.default;
                        const amenityName = amenity.name || amenity.type;
                        const amenityStatus = amenity.status || 'Available';
                        
                        return (
                          <div
                            key={amenity.id || index}
                            className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-border/50 hover:border-primary/50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold capitalize">{amenityName}</p>
                              <p className="text-sm text-muted-foreground capitalize">{amenityStatus}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="floorplans">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Available Floor Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  {units.length === 0 ? (
                    <p className="text-muted-foreground">No floor plans available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {units.map((unit, index) => (
                        <div
                          key={unit.id || index}
                          className="p-6 rounded-lg bg-accent/10 border border-border/50 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">{unit.bhk} BHK</h3>
                            <Badge variant="outline">{unit.area} sq.ft</Badge>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Price</p>
                            <p className="text-2xl font-bold text-primary">
                              ₹{(unit.price / 10000000).toFixed(2)}Cr
                            </p>
                          </div>

                          {unit.facing && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground mb-1">Facing</p>
                              <p className="font-medium">{unit.facing}</p>
                            </div>
                          )}

                          {unit.description && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">{unit.description}</p>
                            </div>
                          )}

                          {unit.features && unit.features.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Key Features:</p>
                              <ul className="space-y-1">
                                {unit.features.map((feature: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {unit.plan_3d && (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setSelected3DPlan(unit.plan_3d)}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              View 3D Floor Plan
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Project Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!aiSummary ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground mb-4">
                        Generate an AI-powered summary of this project
                      </p>
                      <Button onClick={generateAISummary} disabled={aiLoading}>
                        {aiLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate AI Summary
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                        <p className="text-foreground leading-relaxed">{aiSummary}</p>
                      </div>
                      <Button variant="outline" onClick={generateAISummary} disabled={aiLoading}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate Summary
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-8 rounded-xl glass-panel text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Interested in this project?</h3>
          <p className="text-muted-foreground mb-6">
            Contact our team for site visits, pricing details, and exclusive offers
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => setBookingModalOpen(true)}>
              Schedule Site Visit
            </Button>
            <Button size="lg" variant="outline" onClick={() => setInterestModalOpen(true)}>
              Express Interest
            </Button>
          </div>
        </motion.div>
      </div>

      <Footer />

      {/* 3D Plan Dialog */}
      <Dialog open={!!selected3DPlan} onOpenChange={() => setSelected3DPlan(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>3D Floor Plan</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-accent/10 rounded-lg flex items-center justify-center">
            {selected3DPlan ? (
              <iframe
                src={selected3DPlan}
                className="w-full h-full rounded-lg"
                title="3D Floor Plan"
              />
            ) : (
              <p className="text-muted-foreground">3D viewer loading...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Site Visit Booking Modal */}
      {project && (
        <>
          <SiteVisitBookingModal
            open={bookingModalOpen}
            onOpenChange={setBookingModalOpen}
            projectId={project.id}
            projectName={project.name}
          />
          <InterestRegistrationModal
            open={interestModalOpen}
            onOpenChange={setInterestModalOpen}
            projectId={project.id}
            projectName={project.name}
          />
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
