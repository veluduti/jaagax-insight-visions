import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Building2,
  TrendingUp,
  Star,
  Loader2,
  Award,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ProjectWithScore {
  id: number;
  name: string;
  city: string;
  locality: string;
  verified: boolean;
  builder_id: number;
  builder_name: string;
  avg_price: number;
  trust_score: number;
  rera_id: string | null;
  image: string | null;
  builder?: {
    name: string;
  };
}

const TrustScore = () => {
  const [projects, setProjects] = useState<ProjectWithScore[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [userProjects, setUserProjects] = useState<any[]>([]);

  const cities = ["all", "Hyderabad", "Vijayawada"];

  useEffect(() => {
    fetchUser();
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCity, projects]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // Fetch user's projects if they're a builder
      // Note: builder_id is integer but user.id is UUID string
      // This query won't work unless we have a proper mapping
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("builder_name", user.email); // Use email as fallback
      
      setUserProjects(projects || []);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("trust_score", { ascending: false });

      if (error) throw error;
      
      setProjects(data || []);
      setFilteredProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load trust scores");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    if (selectedCity !== "all") {
      filtered = filtered.filter((p) => p.city === selectedCity);
    }

    setFilteredProjects(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const handleSubmitVerification = async () => {
    if (!user) {
      toast.error("Please log in to submit verification");
      return;
    }

    if (!projectId || !selectedFile) {
      toast.error("Please select a project and upload a document");
      return;
    }

    try {
      setUploadLoading(true);

      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${projectId}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("verification-docs")
        .getPublicUrl(fileName);

      // Create verification record
      const { error: verificationError } = await supabase
        .from("verifications")
        .insert({
          project_id: projectId,
          document_url: publicUrl,
          status: "pending",
        });

      if (verificationError) throw verificationError;

      toast.success("Verification submitted successfully!");
      setSelectedFile(null);
      setProjectId("");
      
      // Refresh projects
      fetchProjects();
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error(error.message || "Failed to submit verification");
    } finally {
      setUploadLoading(false);
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getTrustLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Review";
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
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Trust<span className="text-gradient">Score™</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered verification and trust scoring for transparent real estate decisions
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                RERA Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {projects.filter((p) => p.rera_id).length}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                High Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {projects.filter((p) => p.trust_score >= 80).length}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Avg. Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {projects.length > 0
                  ? Math.round(
                      projects.reduce((sum, p) => sum + p.trust_score, 0) / projects.length
                    )
                  : 0}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter & Submit Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 mb-8 rounded-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full md:w-64">
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

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Upload className="h-4 w-4 mr-2" />
                  Submit for Verification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit Project Verification</DialogTitle>
                  <DialogDescription>
                    Upload RERA or legal documents to verify your project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="project">Select Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Choose your project" />
                      </SelectTrigger>
                      <SelectContent>
                        {userProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="document">Upload Document (PDF)</Label>
                    <div className="mt-2">
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                    </div>
                    {selectedFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {selectedFile.name}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSubmitVerification}
                    disabled={uploadLoading || !projectId || !selectedFile}
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Verification
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="all">All Projects</TabsTrigger>
              <TabsTrigger value="verified">RERA Verified</TabsTrigger>
              <TabsTrigger value="high-trust">High Trust Score</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verified" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects
                  .filter((p) => p.rera_id)
                  .map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="high-trust" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects
                  .filter((p) => p.trust_score >= 80)
                  .map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

const ProjectCard = ({ project, index }: { project: ProjectWithScore; index: number }) => {
  const getTrustColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getTrustLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Review";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-panel border-border/50 overflow-hidden group hover:border-primary/50 transition-all duration-300 h-full relative">
        {/* Trust Ring */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative w-16 h-16">
            <svg className="transform -rotate-90 w-16 h-16">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="hsl(var(--border))"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(project.trust_score / 100) * 175.93} 175.93`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${getTrustColor(project.trust_score)}`}>
                {project.trust_score}
              </span>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={project.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800"}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* RERA Badge */}
          {project.rera_id && (
            <Badge className="absolute top-3 left-3 bg-green-500/90 text-white border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              RERA Verified
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="mb-3">
            <h3 className="font-bold text-lg mb-1">{project.name}</h3>
            <p className="text-sm text-muted-foreground">
              {project.builder?.name || "Builder"}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Building2 className="h-4 w-4" />
            {project.locality}, {project.city}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trust Score</span>
              <Badge variant="outline" className={getTrustColor(project.trust_score)}>
                {getTrustLabel(project.trust_score)}
              </Badge>
            </div>
            
            <Progress value={project.trust_score} className="h-2" />

            {project.rera_id && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                RERA: {project.rera_id}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default TrustScore;
