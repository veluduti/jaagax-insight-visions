import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Layers,
  Home,
  IndianRupee,
  CalendarDays,
  MapPin,
  Compass,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { projectService, type Project, type ProjectStats, type ProjectStatus } from "@/services/projectService";

// ---------- Status config (Light theme) ----------
const statusConfig: Record<ProjectStatus, { label: string; color: string; text: string }> = {
  draft: { label: "Draft", color: "bg-gray-200 border-gray-300", text: "text-gray-700" },
  pending_approval: { label: "Pending", color: "bg-amber-100 border-amber-300", text: "text-amber-700" },
  approved: { label: "Approved", color: "bg-blue-100 border-blue-300", text: "text-blue-700" },
  launched: { label: "Launched", color: "bg-emerald-100 border-emerald-300", text: "text-emerald-700" },
  under_construction: {
    label: "Under Construction",
    color: "bg-orange-100 border-orange-300",
    text: "text-orange-700",
  },
  completed: { label: "Completed", color: "bg-teal-100 border-teal-300", text: "text-teal-700" },
};

const TAB_OPTIONS: Array<{ value: "all" | ProjectStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "launched", label: "Launched" },
  { value: "under_construction", label: "Under Construction" },
  { value: "completed", label: "Completed" },
];

const fmtINR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${n.toLocaleString("en-IN")}`;

// ---------- Stat Card (Light theme) ----------
const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: any;
  accent: string;
}) => (
  <Card className="border-border shadow-sm">
    <CardContent className="flex items-center gap-4 p-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ---------- Project Card (Light theme) ----------
const ProjectCard = ({
  project,
  stats,
  onEdit,
  onDelete,
  onView,
}: {
  project: Project;
  stats?: ProjectStats;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const cfg = statusConfig[project.status];
  const total = stats?.total_units ?? project.total_units ?? 0;
  const sold = stats?.sold_units ?? 0;
  const available = stats?.available_units ?? 0;
  const soldPct = total > 0 ? Math.round((sold / total) * 100) : 0;

  return (
    <Card className="group flex h-full flex-col border-border shadow-sm transition hover:shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={`border ${cfg.color} ${cfg.text}`}>{cfg.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {sold}/{total} sold
          </span>
        </div>
        <CardTitle className="line-clamp-1 text-lg text-foreground">{project.name || "Untitled Project"}</CardTitle>
        {project.subtitle && <p className="line-clamp-1 text-xs text-muted-foreground">{project.subtitle}</p>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>Launch: {project.launch_date ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>Poss.: {project.possession_date ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{project.land_area ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span>{project.towers ?? 0} Tower(s)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-2 text-center">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Total</p>
            <p className="text-sm font-semibold text-foreground">{total}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Available</p>
            <p className="text-sm font-semibold text-emerald-600">{available}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Sold</p>
            <p className="text-sm font-semibold text-rose-600">{sold}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sales Progress</span>
            <span>{soldPct}%</span>
          </div>
          <Progress value={soldPct} className="h-2" />
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onView}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Main Dashboard ----------
const BuilderProjectsDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [builderName, setBuilderName] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [statsById, setStatsById] = useState<Record<string, ProjectStats>>({});
  const [activeTab, setActiveTab] = useState<"all" | ProjectStatus>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required");
        navigate("/auth");
        return;
      }

      const { data: bp, error: bpErr } = await supabase
        .from("builder_profiles")
        .select("id, builder_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bpErr) throw bpErr;
      if (!bp) {
        setBuilderName("");
        setProjects([]);
        setLoading(false);
        return;
      }
      setBuilderName(bp.builder_name ?? "");

      // FIXED: Use the correct function name from projectService
      const list = await projectService.listProjectsByBuilder(bp.id);
      setProjects(list);

      const statsArr = await Promise.all(
        list.map(async (p) => {
          try {
            return await projectService.getProjectStats(p.id);
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, ProjectStats> = {};
      statsArr.forEach((s) => {
        if (s) map[s.project_id] = s;
      });
      setStatsById(map);
    } catch (err: any) {
      console.error("BuilderProjectsDashboard load error:", err);
      toast.error("Failed to load projects", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Aggregate stats
  const aggregate = useMemo(() => {
    const acc = { totalUnits: 0, availableUnits: 0, revenue: 0 };
    Object.values(statsById).forEach((s) => {
      acc.totalUnits += Number(s.total_units || 0);
      acc.availableUnits += Number(s.available_units || 0);
      acc.revenue += Number(s.revenue_generated || 0);
    });
    return acc;
  }, [statsById]);

  const filtered = useMemo(
    () => (activeTab === "all" ? projects : projects.filter((p) => p.status === activeTab)),
    [projects, activeTab],
  );

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await projectService.deleteProject(pendingDeleteId);
      toast.success("Project deleted");
      setProjects((p) => p.filter((x) => x.id !== pendingDeleteId));
    } catch (err: any) {
      toast.error("Delete failed", {
        description: err?.message ?? "Could not delete project.",
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">My Projects</h1>
            <p className="text-sm text-muted-foreground">
              {builderName ? `${builderName} • ` : ""}
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => navigate("/add-project")}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mt-6">
          <StatCard label="Total Projects" value={projects.length} icon={Building2} accent="bg-emerald-500" />
          <StatCard label="Total Units" value={aggregate.totalUnits} icon={Layers} accent="bg-sky-500" />
          <StatCard label="Available Units" value={aggregate.availableUnits} icon={Home} accent="bg-teal-500" />
          <StatCard label="Revenue" value={fmtINR(aggregate.revenue)} icon={IndianRupee} accent="bg-amber-500" />
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/50">
              {TAB_OPTIONS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Projects grid / empty */}
        <div className="mt-6">
          {filtered.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium text-foreground">No projects found</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "all"
                    ? "Start by adding your first project."
                    : `No projects with status "${TAB_OPTIONS.find((t) => t.value === activeTab)?.label}".`}
                </p>
                <Button
                  onClick={() => navigate("/add-project")}
                  className="mt-2 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Add Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  stats={statsById[p.id]}
                  onView={() => navigate(`/project/${p.id}`)}
                  onEdit={() => navigate(`/edit-project/${p.id}`)}
                  onDelete={() => setPendingDeleteId(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the project, its units, and construction updates. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BuilderProjectsDashboard;
