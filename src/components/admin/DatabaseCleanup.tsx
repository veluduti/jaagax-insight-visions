import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const DatabaseCleanup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const analyzeDatabase = async () => {
    setLoading(true);
    try {
      // Check ALL properties and filter invalid ones
      const { data: allProps, error: propsError } = await supabase
        .from('properties')
        .select('id, title, city, locality, price, images, description, verified');

      // Check ALL projects and filter invalid ones
      const { data: allProjects, error: projError } = await supabase
        .from('projects')
        .select('id, name, city, locality, builder_name, verified');

      if (propsError || projError) throw propsError || projError;

      // Filter properties with any critical issues
      const invalidProps = allProps?.filter(p => 
        !p.title || 
        p.title.trim() === '' ||
        !p.city || 
        p.city.trim() === '' ||
        !p.locality || 
        p.locality.trim() === '' ||
        !p.price || 
        p.price <= 0 ||
        !p.verified
      ) || [];

      // Filter projects with any critical issues
      const invalidProjects = allProjects?.filter(p => 
        !p.name || 
        p.name.trim() === '' ||
        !p.city || 
        p.city.trim() === '' ||
        !p.locality || 
        p.locality.trim() === '' ||
        !p.verified
      ) || [];

      setStats({
        invalidProperties: invalidProps?.length || 0,
        invalidProjects: invalidProjects?.length || 0,
        propertyIds: invalidProps?.map(p => p.id) || [],
        projectIds: invalidProjects?.map(p => p.id) || []
      });

    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupDatabase = async () => {
    if (!stats) return;

    const confirmed = confirm(
      `This will permanently delete:\n` +
      `- ${stats.invalidProperties} invalid properties\n` +
      `- ${stats.invalidProjects} invalid projects\n\n` +
      `Are you sure you want to continue?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // Delete invalid properties
      if (stats.propertyIds.length > 0) {
        const { error: propError } = await supabase
          .from('properties')
          .delete()
          .in('id', stats.propertyIds);

        if (propError) throw propError;
      }

      // Delete invalid projects
      if (stats.projectIds.length > 0) {
        const { error: projError } = await supabase
          .from('projects')
          .delete()
          .in('id', stats.projectIds);

        if (projError) throw projError;
      }

      toast({
        title: "Cleanup Complete",
        description: `Removed ${stats.invalidProperties} properties and ${stats.invalidProjects} projects`
      });

      setStats(null);
      
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Database Cleanup
        </CardTitle>
        <CardDescription>
          Remove properties and projects with missing critical data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will permanently delete properties and projects that are:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Not verified by admin</li>
              <li>Missing Title/Name, City, or Locality</li>
              <li>Missing or invalid price (for properties)</li>
              <li>Have empty or incomplete data</li>
            </ul>
          </AlertDescription>
        </Alert>

        {!stats ? (
          <Button
            onClick={analyzeDatabase}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Database...
              </>
            ) : (
              'Analyze Database'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">Analysis Results:</h4>
              <ul className="space-y-1 text-sm">
                <li>Invalid Properties: <strong>{stats.invalidProperties}</strong></li>
                <li>Invalid Projects: <strong>{stats.invalidProjects}</strong></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={cleanupDatabase}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Invalid Data
                  </>
                )}
              </Button>
              <Button
                onClick={() => setStats(null)}
                disabled={loading}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
