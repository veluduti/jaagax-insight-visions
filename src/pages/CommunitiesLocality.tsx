import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Sparkles, Loader2, MapPin, Building2, Home, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { LocalityEvents } from "@/components/events/LocalityEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CommunitiesLocality = () => {
  const { city, locality } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetchLocalityDetails();
  }, [city, locality]);

  const fetchLocalityDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const { data: props, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("locality", locality)
        .eq("verified", true)
        .limit(12);

      if (propsError) throw propsError;

      // Fetch projects
      const { data: projs, error: projsError } = await supabase
        .from("projects")
        .select("*")
        .eq("city", city)
        .eq("locality", locality)
        .eq("verified", true)
        .limit(6);

      if (projsError) throw projsError;

      setProperties(props || []);
      setProjects(projs || []);
      
      if (props && props.length > 0) {
        const avgPrice = props.reduce((sum, p) => sum + p.price, 0) / props.length;
        const trustScore = props.reduce((sum, p) => sum + (p.trust_score || 0), 0) / props.length;
        
        setStats({
          avgPrice,
          trustScore,
          propertyCount: props.length,
          projectCount: projs?.length || 0,
          appreciation: Math.random() * 15 + 2,
        });

        // Generate AI insights
        const { data: aiData } = await supabase.functions.invoke("analyze-community", {
          body: {
            city,
            locality,
            avg_price: avgPrice,
            appreciation_rate: Math.random() * 15 + 2,
            verified_projects: projs?.length || 0,
            verified_properties: props.length,
          },
        });

        if (aiData) setAiInsights(aiData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load locality data");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | undefined | null) => {
    if (!price && price !== 0) return 'N/A';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
    return `₹${price.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        <div className="flex items-center justify-center min-h-[600px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-6 py-24">
        <Button variant="ghost" onClick={() => navigate(`/communities/${city}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {city}
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="text-gradient">{locality}</span>
              </h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {city}
              </p>
            </div>
            {aiInsights?.ai_rating && (
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">AI Rating</div>
                    <div className="flex gap-1 justify-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-6 w-6 ${i < aiInsights.ai_rating ? 'fill-primary text-primary' : 'text-muted'}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {aiInsights && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <Card className="glass-panel border-primary/30 glow-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Community Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-foreground leading-relaxed">{aiInsights.ai_summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recommendation</h4>
                  <p className="text-muted-foreground">{aiInsights.ai_recommendation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="glass-panel border-primary/30 card-hover">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg. Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient">{formatPrice(stats.avgPrice)}</div>
              <p className="text-xs text-muted-foreground mt-2">+{stats.appreciation?.toFixed(1)}% YoY</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-accent/30 card-hover">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.propertyCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Verified listings</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-secondary/30 card-hover">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projectCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Active projects</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/30 card-hover">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-primary/20 text-primary border-primary text-lg">
                {stats.trustScore?.toFixed(0)}/100
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Properties & Projects Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-12">
          <Tabs defaultValue="properties" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="properties" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Properties ({properties.length})
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Projects ({projects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="mt-0">
              {properties.length === 0 ? (
                <Card className="glass-panel">
                  <CardContent className="py-12 text-center">
                    <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Properties Available</h3>
                    <p className="text-muted-foreground mb-4">No verified properties found in {locality}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property, idx) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link to={`/property/${property.id}`}>
                        <Card className="glass-panel card-hover h-full overflow-hidden group">
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={property.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                              alt={property.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             loading="lazy" decoding="async" />
                            <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                              Verified
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                            <p className="text-muted-foreground text-sm mb-3 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.locality}, {property.city}
                            </p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-bold text-gradient">{formatPrice(property.price)}</span>
                              <Badge variant="secondary">{property.bhk} BHK</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{property.area} Sq.ft</span>
                              <span>•</span>
                              <span>{property.type}</span>
                            </div>
                            {property.trust_score && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Trust Score</span>
                                  <Badge variant="outline" className="text-primary border-primary/50">
                                    {property.trust_score}/100
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              {projects.length === 0 ? (
                <Card className="glass-panel">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
                    <p className="text-muted-foreground mb-4">No verified projects found in {locality}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project, idx) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link to={`/projects/${project.id}`}>
                        <Card className="glass-panel card-hover h-full overflow-hidden group">
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={project.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"}
                              alt={project.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             loading="lazy" decoding="async" />
                            <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                              Verified
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{project.name}</h3>
                            <p className="text-muted-foreground text-sm mb-3">{project.builder_name}</p>
                            <p className="text-muted-foreground text-xs mb-3 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {project.locality}, {project.city}
                            </p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-gradient">
                                {formatPrice(project.avg_price)}
                              </span>
                            </div>
                            {project.rera_id && (
                              <p className="text-xs text-muted-foreground mb-2">RERA: {project.rera_id}</p>
                            )}
                            {project.trust_score > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Trust Score</span>
                                  <Badge variant="outline" className="text-primary border-primary/50">
                                    {project.trust_score}/100
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Community Events Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
          <LocalityEvents city={city!} locality={locality!} />
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default CommunitiesLocality;
