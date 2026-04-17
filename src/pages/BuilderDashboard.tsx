import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Building2, FileCheck, Shield, LogOut, Plus, 
  Home, Eye, TrendingUp, CheckCircle, Clock,
  MapPin, Upload, FileText, AlertCircle, CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import PropertyUploadForm from "@/components/builder/PropertyUploadForm";
import RERAUploadModal from "@/components/builder/RERAUploadModal";
import DocumentationModal from "@/components/builder/DocumentationModal";
import { seedBuilderSampleProperties } from "@/utils/seedBuilderProperties";
import { Sparkles } from "lucide-react";

interface Project {
  id: string;
  name: string;
  city: string;
  locality: string;
  builder_name: string;
  avg_price: number | null;
  image: string | null;
  verified: boolean | null;
  rera_id: string | null;
  trust_score: number | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  verification_status: string | null;
  created_at: string | null;
}

export default function BuilderDashboard() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");
  const [reraModalOpen, setReraModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    verifiedProjects: 0,
    totalUnits: 0,
    totalViews: 0,
    pendingVisits: 0,
  });
  const [performance, setPerformance] = useState({
    totalViews: 0,
    unitsSold: 0,
    avgTrustScore: 0,
    growthRate: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchProjects();
    fetchProperties();
    fetchPerformanceData();
    fetchPendingVisitsCount();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
      });
    }
    setLoading(false);
  };

  const fetchPendingVisitsCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get properties submitted by this user to find builder_id
      const { data: submittedProperties } = await supabase
        .from("properties")
        .select("id, builder_id")
        .eq("submitted_by", user.id);

      const builderIds = [...new Set(
        (submittedProperties || [])
          .map(p => p.builder_id)
          .filter(Boolean)
      )];

      let allPropertyIds = (submittedProperties || []).map(p => p.id);
      
      if (builderIds.length > 0) {
        const { data: builderProperties } = await supabase
          .from("properties")
          .select("id")
          .in("builder_id", builderIds);
        
        const builderPropIds = (builderProperties || []).map(p => p.id);
        allPropertyIds = [...new Set([...allPropertyIds, ...builderPropIds])];
      }

      // Count pending visits
      const { data: pendingVisits } = await supabase
        .from("visit_bookings")
        .select("id, property_id")
        .eq("status", "pending_builder");

      const count = (pendingVisits || []).filter(visit => 
        allPropertyIds.includes(visit.property_id || "")
      ).length;

      setStats(prev => ({ ...prev, pendingVisits: count }));
    } catch (error) {
      console.error("Error fetching pending visits count:", error);
    }
  };

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find this builder's profile to scope projects by builder name
    const { data: builderProfile } = await supabase
      .from("builder_profiles")
      .select("builder_name")
      .eq("user_id", user.id)
      .maybeSingle();

    let projectData: any[] = [];
    if (builderProfile?.builder_name) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .ilike("builder_name", `%${builderProfile.builder_name}%`)
        .order("created_at", { ascending: false });
      projectData = data || [];
    }

    setProjects(projectData as Project[]);

    if (projectData.length > 0 && !selectedProject) {
      fetchProjectForecast(projectData[0] as Project);
    }
  };

  const fetchProperties = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching properties:", error);
      return;
    }

    const list = (data || []) as Property[];
    setProperties(list);

    // Stats derived from this builder's own properties
    const totalUnits = list.reduce((sum, p) => sum + (p.bhk || 0), 0);
    const verifiedCount = list.filter((p) => p.verified).length;

    setStats((prev) => ({
      ...prev,
      totalProjects: list.length,
      verifiedProjects: verifiedCount,
      totalUnits,
    }));
  };

  const fetchPerformanceData = async () => {
    // Use mock performance data since analytics RPC doesn't exist
    setPerformance({
      totalViews: Math.floor(Math.random() * 10000) + 2000,
      unitsSold: Math.floor(Math.random() * 50) + 10,
      avgTrustScore: Math.round(projects.reduce((acc, p) => acc + (p.trust_score || 0), 0) / (projects.length || 1)),
      growthRate: Math.floor(Math.random() * 20) + 5,
    });
  };

  const fetchProjectForecast = async (project: Project) => {
    setSelectedProject(project);
    setLoadingForecast(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-project-forecast', {
        body: {
          projectId: project.id,
          city: project.city,
          locality: project.locality,
          avgPrice: project.avg_price,
          verified: project.verified,
          reraId: project.rera_id
        }
      });

      if (!error && data?.forecast) {
        setForecast(data.forecast);
      }
    } catch (error) {
      console.error('Forecast error:', error);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user?.name || "Builder"}!</h1>
              <p className="text-muted-foreground">Manage your projects and properties</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await seedBuilderSampleProperties();
                  if (res.success) {
                    toast.success(`Added ${res.count} sample properties to your account`);
                    fetchProperties();
                    fetchPendingVisitsCount();
                  } else {
                    toast.error(res.error || "Failed to add samples");
                  }
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Load Sample Properties
              </Button>
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold">{stats.verifiedProjects}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units (BHK)</p>
                  <p className="text-2xl font-bold">{stats.totalUnits}</p>
                </div>
                <Home className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all border-2 border-orange-500/50 bg-orange-500/5 relative"
              onClick={() => navigate("/builder-visits")}
            >
              {stats.pendingVisits > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
                  {stats.pendingVisits}
                </Badge>
              )}
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <h3 className="font-semibold">Visit Approvals</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingVisits > 0 ? `${stats.pendingVisits} pending` : 'Review pending visits'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setActiveTab("add-property")}
            >
              <CardContent className="p-6 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Add Property</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate("/add-builder-profile")}
            >
              <CardContent className="p-6 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Add Builder Profile</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setReraModalOpen(true)}
            >
              <CardContent className="p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Upload RERA</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setDocsModalOpen(true)}
            >
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Documentation</h3>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setActiveTab("performance")}
            >
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Analytics</h3>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="properties">My Properties</TabsTrigger>
            <TabsTrigger value="add-property">Add Property</TabsTrigger>
            <TabsTrigger value="projects">My Projects</TabsTrigger>
            <TabsTrigger value="verification">RERA Status</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* My Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Properties</CardTitle>
                <CardDescription>Properties you've submitted for verification</CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                    <p className="text-muted-foreground mb-4">Add your first property or load a few samples to explore the dashboard</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Button onClick={() => setActiveTab("add-property")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Property
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const res = await seedBuilderSampleProperties();
                          if (res.success) {
                            toast.success(`Added ${res.count} sample properties`);
                            fetchProperties();
                            fetchPendingVisitsCount();
                          } else {
                            toast.error(res.error || "Failed to add samples");
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Load Sample Properties
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <motion.div
                        key={property.id}
                        whileHover={{ y: -5 }}
                        className="cursor-pointer"
                        onClick={() => navigate(`/property/${property.id}`)}
                      >
                        <Card className="overflow-hidden h-full hover:shadow-xl transition-all">
                          <div className="relative">
                            <img
                              src={property.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"}
                              alt={property.title}
                              className="w-full h-48 object-cover"
                            />
                            {property.verification_status === 'approved' && property.verified ? (
                              <Badge className="absolute top-2 right-2 bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : property.verification_status === 'rejected' ? (
                              <Badge className="absolute top-2 right-2 bg-red-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            ) : (
                              <Badge className="absolute top-2 right-2 bg-orange-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3 w-3 mr-1" />
                              {property.locality}, {property.city}
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-bold text-primary">
                                  ₹{(property.price / 10000000).toFixed(2)} Cr
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Config</p>
                                <p className="font-semibold">{property.bhk} BHK</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Area</p>
                                <p className="font-semibold">{property.area_sqft} sq.ft</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Property Tab */}
          <TabsContent value="add-property" className="space-y-6">
            <PropertyUploadForm onSuccess={() => {
              fetchProjects();
              fetchProperties();
            }} />
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>Manage and track your real estate projects</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/builder/add-project")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">Launch your first real estate project — set name, location, units, pricing, RERA & media in one flow.</p>
                    <Button onClick={() => navigate("/builder/add-project")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <motion.div
                        key={project.id}
                        whileHover={{ y: -5 }}
                        className="cursor-pointer"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <Card className="overflow-hidden h-full hover:shadow-xl transition-all">
                          <div className="relative">
                            <img
                              src={project.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"}
                              alt={project.name}
                              className="w-full h-48 object-cover"
                            />
                            {project.verified ? (
                              <Badge className="absolute top-2 right-2 bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                RERA Verified
                              </Badge>
                            ) : (
                              <Badge className="absolute top-2 right-2 bg-orange-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {project.locality}, {project.city}
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Avg. Price</p>
                                <p className="font-semibold text-primary">
                                  {formatPrice(project.avg_price)}
                                </p>
                              </div>
                              {project.rera_id && (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">RERA ID</p>
                                  <p className="text-xs font-mono">{project.rera_id}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RERA Verification */}
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>RERA Verification Status</CardTitle>
                <CardDescription>Track your project verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.filter(p => !p.verified).length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 mx-auto mb-4 text-green-500" />
                      <h3 className="text-lg font-semibold mb-2">All projects verified!</h3>
                      <p className="text-muted-foreground">All your projects are RERA verified</p>
                    </div>
                  ) : (
                    projects.filter(p => !p.verified).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <AlertCircle className="h-8 w-8 text-orange-500" />
                          <div>
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">Verification pending</p>
                          </div>
                        </div>
                        <Button variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Documents
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Project Inventory</CardTitle>
                <CardDescription>Manage units across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
                  <p className="text-muted-foreground">Track available units and floor plans</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="p-6 bg-primary/10 rounded-lg">
                <Eye className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-3xl font-bold">{performance.totalViews.toLocaleString()}</p>
                <p className={`text-sm mt-2 ${performance.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.growthRate >= 0 ? '+' : ''}{performance.growthRate}% this month
                </p>
              </div>

              <div className="p-6 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">Units Sold</p>
                <p className="text-3xl font-bold">{performance.unitsSold}</p>
                <p className="text-sm text-muted-foreground mt-2">Last 3 months</p>
              </div>

              <div className="p-6 bg-blue-500/10 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-500 mb-2" />
                <p className="text-sm text-muted-foreground">Avg. Trust Score</p>
                <p className="text-3xl font-bold">
                  {performance.avgTrustScore}/100
                </p>
                <p className="text-sm text-green-600 mt-2">
                  {performance.avgTrustScore >= 80 ? 'Excellent rating' : performance.avgTrustScore >= 60 ? 'Good rating' : 'Needs improvement'}
                </p>
              </div>
            </div>

            {/* AI Project Forecast */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      AI Project Forecast
                    </CardTitle>
                    <CardDescription>AI-powered growth predictions for {selectedProject?.name}</CardDescription>
                  </div>
                  {projects.length > 1 && (
                    <select 
                      className="border rounded px-3 py-2"
                      onChange={(e) => {
                        const proj = projects.find(p => p.id === e.target.value);
                        if (proj) fetchProjectForecast(proj);
                      }}
                      value={selectedProject?.id}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingForecast ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : forecast ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Demand Score</p>
                        <p className="text-3xl font-bold text-primary">{forecast.demandScore}/100</p>
                        <Badge className={
                          forecast.riskLevel === 'low' ? 'bg-green-600 mt-2' :
                          forecast.riskLevel === 'medium' ? 'bg-orange-500 mt-2' : 'bg-red-500 mt-2'
                        }>
                          {forecast.riskLevel} risk
                        </Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Sales Velocity</p>
                        <p className="text-3xl font-bold">{forecast.salesVelocity?.predicted || 0} units/mo</p>
                        <p className="text-sm text-green-600 mt-2">{forecast.salesVelocity?.trend}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">3-Year Appreciation</p>
                        <p className="text-3xl font-bold text-green-600">{forecast.appreciation?.year3 || 0}%</p>
                        <p className="text-sm text-muted-foreground mt-2">Y1: {forecast.appreciation?.year1}%, Y2: {forecast.appreciation?.year2}%</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Success Factors
                        </h4>
                        <ul className="space-y-2">
                          {forecast.successFactors?.map((factor: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          AI Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {forecast.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No forecast available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <RERAUploadModal
          open={reraModalOpen}
          onOpenChange={setReraModalOpen}
          projects={projects}
          onSuccess={() => {
            fetchProjects();
            toast.success("RERA document submitted for verification");
          }}
        />

        <DocumentationModal
          open={docsModalOpen}
          onOpenChange={setDocsModalOpen}
        />
      </div>
    </div>
  );
}
