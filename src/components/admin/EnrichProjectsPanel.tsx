import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const EnrichProjectsPanel = () => {
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const enrichAllProjects = async () => {
    try {
      setEnriching(true);
      setProgress("Fetching all verified projects...");

      // Fetch all verified projects
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, name, city, locality")
        .eq("verified", true);

      if (error) throw error;

      if (!projects || projects.length === 0) {
        toast.info("No verified projects found");
        setEnriching(false);
        setProgress("");
        return;
      }

      toast.info(`Starting enrichment for ${projects.length} projects...`);
      
      let successCount = 0;
      let errorCount = 0;

      // Enrich projects one by one
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        setProgress(`Enriching ${project.name} (${i + 1}/${projects.length})...`);

        try {
          const { error: enrichError } = await supabase.functions.invoke(
            "enrich-project-data",
            { body: { projectId: project.id } }
          );

          if (enrichError) {
            console.error(`Failed to enrich project ${project.id}:`, enrichError);
            errorCount++;
          } else {
            successCount++;
          }

          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`Error enriching project ${project.id}:`, err);
          errorCount++;
        }
      }

      setProgress("");
      toast.success(
        `Enrichment complete! ${successCount} succeeded, ${errorCount} failed`
      );
    } catch (error) {
      console.error("Error enriching projects:", error);
      toast.error("Failed to enrich projects");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Project Data Enrichment
        </CardTitle>
        <CardDescription>
          Automatically enrich all projects with real-time web data using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This will fetch comprehensive data (amenities, floor plans, specifications, highlights) 
            for all verified projects using AI-powered web search and analysis. 
            The process may take several minutes depending on the number of projects.
          </AlertDescription>
        </Alert>

        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={enrichAllProjects}
            disabled={enriching}
            className="flex-1"
          >
            {enriching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enriching Projects...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enrich All Projects
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="mb-2">
            <strong>Note:</strong> Projects with existing enriched data will be updated. Data includes:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>15-20 comprehensive amenities</li>
            <li>3-4 detailed floor plan variants</li>
            <li>8-10 specification categories</li>
            <li>6-8 key highlights</li>
            <li>Enhanced project overview</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
