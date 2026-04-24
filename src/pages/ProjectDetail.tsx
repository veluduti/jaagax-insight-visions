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
  ArrowLeft,
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
  Hash,
  Calendar,
  Brain,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { SiteVisitBookingModal } from "@/components/booking/SiteVisitBookingModal";
import { InterestRegistrationModal } from "@/components/booking/InterestRegistrationModal";
import { BuilderTrustProgram } from "@/components/builder/BuilderTrustProgram";
import PropertyBreadcrumb from "@/components/property/PropertyBreadcrumb";
import MediaHub from "@/components/property/MediaHub";
import PropertyStats from "@/components/property/PropertyStats";
import EMICalculator from "@/components/property/EMICalculator";
import PaymentPlans from "@/components/property/PaymentPlans";
import NearbyPOI from "@/components/property/NearbyPOI";
import AuthGate from "@/components/property/AuthGate";
import { useAuth } from "@/hooks/useAuth";

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
  latitude?: number | null;
  longitude?: number | null;
  brochure_url?: string | null;
  videos?: string[] | null;
  overview?: string;
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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Validate slug parameter
  useEffect(() => {
    if (!slug) {
      toast.error("Invalid project URL");
      navigate("/projects");
    }
  }, [slug, navigate]);

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

  const galleryImages: string[] =
    project?.images && project.images.length > 0
      ? project.images
      : [
          project?.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600",
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600",
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600",
        ];

  const PROJECT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    if (slug) {
      fetchProjectDetails();
    }
  }, [slug]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      let isPrivileged = false;
      if (user) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        isPrivileged = (roleRows || []).some((r: any) => r.role === "admin");
      }

      const buildQuery = (col: "slug" | "id", val: string) => {
        let q = supabase.from("projects").select("*").eq(col, val);
        if (!isPrivileged && !user) {
          q = q.eq("verified", true);
        }
        return q.maybeSingle();
      };

      let { data: projectData, error: projectError } = await buildQuery("slug", slug as string);

      if (!projectData && slug && PROJECT_UUID_RE.test(slug)) {
        const res = await buildQuery("id", slug);
        projectData = res.data;
        projectError = res.error;
        if (projectData && (projectData as any).slug) {
          navigate(`/project/${(projectData as any).slug}`, { replace: true });
          return;
        }
      }

      if (projectData && !projectData.verified && !isPrivileged) {
        if (!user || projectData.submitted_by !== user.id) {
          projectData = null;
        }
      }

      if (projectError) throw projectError;

      if (!projectData) {
        setProject(null);
        setLoading(false);
        return;
      }

      if (!projectData.name || !projectData.city || !projectData.locality) {
        setProject(null);
        setLoading(false);
        return;
      }

      setProject(projectData);

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
        setAiSummary(
          `${project.name} is a premium ${project.city}-based development by ${project.builder_name || "a renowned builder"}. ` +
          `Located in ${project.locality}, this project offers modern living spaces with world-class amenities. ` +
          `With a trust score of ${project.trust_score}/100 and ${project.rera_id ? "RERA certification" : "ongoing verification"}, ` +
          `this project represents excellent value starting from ₹${((project.avg_price || 0) / 10000000).toFixed(2)} Crores. ` +
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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="glass-panel rounded-2xl p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Project Not Found</h2>
              <p className="text-muted-foreground">
                The project you're looking for doesn't exist or hasn't been approved yet.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => navigate("/projects")} className="flex-1 gap-2">
                <Building2 className="h-4 w-4" />
                Browse Projects
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                Go Home
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const startingPrice = project.avg_price ? `₹${(project.avg_price / 10000000).toFixed(2)} Cr` : "Price on request";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Back Button & Breadcrumb */}
      <div className="container mx-auto px-4 py-4 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <PropertyBreadcrumb
          city={project.city}
          locality={project.locality}
          title={project.name}
        />

        {/* Project Reference */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>Project Ref: <span className="font-semibold text-foreground">JX{project.id.slice(0, 8)}</span></span>
        </div>
      </div>

      {/* Media Hub - Same as Property */}
      <MediaHub
        images={galleryImages}
        videos={project.videos || []}
        floorplans={[]}
        brochureUrl={project.brochure_url || undefined}
        propertyId={project.id}
        propertyTitle={project.name}
      />

      {/* Action Buttons */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="flex flex-wrap gap-2">
            {project.rera_id && (
              <Badge variant="default" className="bg-primary/90">
                <Shield className="h-3 w-3 mr-1" />
                RERA: {project.rera_id}
              </Badge>
            )}
            {project.trust_score != null && (
              <Badge variant="outline" className="border-primary/50">
                Trust Score: {project.trust_score}/100
              </Badge>
            )}
            <Badge variant="secondary">By {project.builder_name || "Builder"}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="gap-2" onClick={() => setBookingModalOpen(true)}>
              <Calendar className="h-4 w-4" />
              Book Visit
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => setInterestModalOpen(true)}
            >
              <Heart className="h-4 w-4" />
              Express Interest
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Project Stats */}
        <PropertyStats entityId={project.id} entityType="project" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{project.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-5 w-5" />
                    <span>{project.locality}, {project.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                  <p className="text-3xl font-bold text-primary">{startingPrice}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {project.bhk_types && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                    <p className="text-xs text-muted-foreground">Configurations</p>
                    <p className="font-semibold text-sm mt-1">{project.bhk_types}</p>
                  </div>
                )}
                {project.area_range && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                    <p className="text-xs text-muted-foreground">Area Range</p>
                    <p className="font-semibold text-sm mt-1">{project.area_range}</p>
                  </div>
                )}
                {project.status && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold text-sm mt-1">{project.status}</p>
                  </div>
                )}
                {project.possession_date && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
                    <p className="text-xs text-muted-foreground">Possession</p>
                    <p className="font-semibold text-sm mt-1">{project.possession_date}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Tabs Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-panel rounded-xl p-6"
            >
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="builder" className="gap-1">
                    <Award className="h-3 w-3" />
                    Builder
                  </TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="floorplans">Floor Plans</TabsTrigger>
                  <TabsTrigger value="ai">AI Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Project Overview</h3>
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
                </TabsContent>

                <TabsContent value="builder">
                  {project.builder_id ? (
                    <BuilderTrustProgram
                      builderId={project.builder_id}
                      builderName={project.builder_name}
                    />
                  ) : project.builder_name ? (
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          {project.builder_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {project.builder_name} is the developer of {project.name}, located in {project.locality}, {project.city}.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="py-12 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Builder information not available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="amenities">
                  {amenities.length === 0 ? (
                    <p className="text-muted-foreground">No amenities information available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {amenities.map((amenity, index) => {
                        const amenityType = amenity.type?.toLowerCase() || 'default';
                        const Icon = amenityIcons[amenityType] || amenityIcons.default;
                        return (
                          <div
                            key={amenity.id || index}
                            className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-border/50 hover:border-primary/50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold capitalize">{amenity.name || amenity.type}</p>
                              <p className="text-sm text-muted-foreground capitalize">{amenity.status || 'Available'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="floorplans">
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
                </TabsContent>

                <TabsContent value="ai">
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
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Nearby POI */}
            <NearbyPOI
              city={project.city}
              lat={project.latitude ?? null}
              lng={project.longitude ?? null}
              locality={project.locality}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* EMI Calculator */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to use EMI calculator">
              <EMICalculator propertyPrice={project.avg_price || 0} />
            </AuthGate>

            {/* Payment Plans */}
            <AuthGate isAuthenticated={isAuthenticated} label="Sign in to view payment plans">
              <PaymentPlans
                propertyPrice={project.avg_price || 0}
                status={project.status || "Ready"}
              />
            </AuthGate>
          </div>
        </div>
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

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t p-4 z-50">
        <div className="flex gap-2">
          <Button size="lg" className="flex-1 gap-2" onClick={() => setBookingModalOpen(true)}>
            <Calendar className="h-4 w-4" />
            Book Visit
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setInterestModalOpen(true)}
          >
            <Heart className="h-4 w-4" />
            Interest
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
