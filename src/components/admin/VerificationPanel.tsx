import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PendingProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  type: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bhk: number | null;
  images: any;
  verification_status: string | null;
  listed_by: string | null;
  submitted_by: string | null;
}

interface PendingProject {
  id: string;
  name: string;
  city: string;
  locality: string;
  builder_name: string;
  avg_price: number;
  verified: boolean | null;
}

export default function VerificationPanel() {
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [projects, setProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      // Builder-submitted properties → straight Approve/Reject, no agent assignment.
      // Seller/agent properties are handled by the "Assign Agent" panel.
      const [propertiesRes, projectsRes] = await Promise.all([
        supabase
          .from("properties")
          .select("*")
          .eq("verification_status", "pending")
          .eq("listed_by", "builder")
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("*")
          .eq("verified", false)
          .order("created_at", { ascending: false }),
      ]);

      if (propertiesRes.data) setProperties(propertiesRes.data as any);
      if (projectsRes.data) setProjects(projectsRes.data as any);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyVerification = async (
    property: PendingProperty,
    status: "approved" | "rejected"
  ) => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Reason for rejection (visible to builder):", "Listing details need clarification");
      if (!reason) return;
    }
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          verification_status: status,
          verified: status === "approved",
          rejection_reason: status === "rejected" ? reason : null,
        })
        .eq("id", property.id);

      if (error) throw error;

      // Notify the builder (submitter)
      if (property.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: property.submitted_by,
          type: status === "approved" ? "property_approved" : "property_rejected",
          title: status === "approved" ? "Property approved & live" : "Property rejected",
          message:
            status === "approved"
              ? `${property.title} has been approved and is now visible to buyers.`
              : `${property.title} was rejected. Reason: ${reason}. You can edit and resubmit.`,
          link: status === "approved" ? `/property/${property.id}` : "/dashboard/builder",
        });
      }

      setProperties(prev => prev.filter(p => p.id !== property.id));

      toast.success(
        status === "approved"
          ? "Property approved and listed!"
          : "Property rejected"
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update property");
    }
  };

  const handleProjectVerification = async (
    project: PendingProject,
    status: "approved" | "rejected"
  ) => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Reason for rejection (visible to builder):", "Project details need clarification");
      if (!reason) return;
    }
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          verified: status === "approved",
        })
        .eq("id", project.id);

      if (error) throw error;

      // Notify the builder (submitter)
      const { data: proj } = await supabase
        .from("projects")
        .select("submitted_by")
        .eq("id", project.id)
        .maybeSingle();

      if (proj?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: proj.submitted_by,
          type: status === "approved" ? "project_approved" : "project_rejected",
          title: status === "approved" ? "Project approved & live" : "Project rejected",
          message:
            status === "approved"
              ? `${project.name} has been approved and is now visible to buyers.`
              : `${project.name} was rejected. Reason: ${reason}.`,
          link: status === "approved" ? `/projects/${project.id}` : "/dashboard/builder",
        });
      }

      setProjects(prev => prev.filter(p => p.id !== project.id));

      toast.success(
        status === "approved"
          ? "Project approved and listed!"
          : "Project rejected"
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="properties" className="w-full">
      <TabsList>
        <TabsTrigger value="properties">
          Properties ({properties.length})
        </TabsTrigger>
        <TabsTrigger value="projects">
          Projects ({projects.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="properties" className="mt-6">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending property verifications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={Array.isArray(property.images) && property.images[0] ? property.images[0] : "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 right-2 bg-orange-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {property.locality || 'N/A'}, {property.city || 'N/A'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold ml-2">{formatPrice(property.price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Area:</span>
                      <span className="font-semibold ml-2">{property.area_sqft || 0} sq.ft</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-semibold ml-2">{property.type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BHK:</span>
                      <span className="font-semibold ml-2">{property.bhk || property.bedrooms || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePropertyVerification(property.id, "approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handlePropertyVerification(property.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="projects" className="mt-6">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending project verifications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription>
                        {project.locality}, {project.city}
                      </CardDescription>
                    </div>
                    <Badge className="bg-orange-500">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Builder:</span>
                      <span className="font-semibold">{project.builder_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg. Price:</span>
                      <span className="font-semibold">{formatPrice(project.avg_price)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleProjectVerification(project.id, "approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleProjectVerification(project.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
