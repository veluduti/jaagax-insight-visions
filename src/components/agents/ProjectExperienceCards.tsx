import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CalendarClock, MapPin } from "lucide-react";
import type { AgentProjectExperience } from "./projectExperience";

/** Public read-only display of an agent's project experience. */
const ProjectExperienceCards = ({ projects }: { projects: AgentProjectExperience[] }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, 3);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Project Experience</CardTitle>
        {projects.length > 3 && (
          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show Less" : `View All Projects (${projects.length})`}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No project experience added yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {p.project_name}
                  </h4>
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                </div>
                <Badge variant="secondary" className="mt-2 rounded-full px-2.5 py-0.5 text-xs">
                  {p.project_type}
                </Badge>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    {Number(p.experience_years) || 0}{" "}
                    {Number(p.experience_years) === 1 ? "year" : "years"} experience
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {p.project_location?.trim() || "Location not specified"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectExperienceCards;
