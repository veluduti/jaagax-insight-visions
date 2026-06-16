import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Plus, Edit, Trash2, Eye, Loader2, Layers, Home,
  IndianRupee, CalendarDays, MapPin, Compass, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  projectService,
  type Project,
  type ProjectStats,
  type ProjectStatus,
} from "@/services/projectService";

// ---------- Status config ----------
const statusConfig: Record<ProjectStatus, { label: string; color: string; text: string }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 border-gray-500/40", text: "text-gray-300" },
  pending_approval: { label: "Pending", color: "bg-amber-500/20 border-amber-500/40", text: "text-amber-300" },
  approved: { label: "Approved", color: "bg-sky-500/20 border-sky-500/40", text: "text-sky-300" },
  launched: { label: "Launched", color: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300" },
  under_construction: { label: "Under Construction", color: "bg-orange-500/20 border-orange-500/40", text: "text-orange-300" },
  completed: { label: "Completed", color: "bg-teal-500/20 border-teal-500/40", text: "text-teal-300" },
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
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr`
  : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`
  : `₹${n.toLocaleString("en-IN")}`;

// ---------- Stat Card ----------
const StatCard = ({
  label, value, icon: Icon, accent,
}: { label: string; value: string | number; icon: any; accent: string }) => (
  <Card className="border-white/10 bg-white/5 backdrop-blur">
    <CardContent className="flex items-center gap-4 p-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ---------- Project Card ----------
const ProjectCard = ({
  project, stats, onEdit, onDelete, onView,
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
    <Card className="group flex h-full flex-col border-white/10 bg-white/5 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/10">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={`border ${cfg.color} ${cfg.text}`}>{cfg.label}</Badge>
          <span className="text-xs text-white/50">
            {sold}/{total} sold
          </span>
        </div>
        <CardTitle className="line-clamp-1 text-lg text-white">
          {project.name || "Untitled Project"}
        </CardTitle>
        {project.subtitle && (
          <p className="line-clamp-1 text-xs text-white/60">{project.subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
            <span>Launch: {project.launch_date ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
            <span>Poss.: {project.possession_date ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>{project.land_area ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span>{project.towers ?? 0} Tower(s)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-center">
          <div>
            <p className="text-[10px] uppercase text-white/50">Total</p>
            <p className="text-sm font-semibold text-white">{total}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Available</p>
            <p className="text-sm font-semibold text-emerald-300">{available}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Sold</p>
            <p className="text-sm font-semibold text-rose-300">{sold}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/60">
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
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in required", variant: "destructive" });
        navigate("/auth");
        return;
      }
      const { data: bp, error: bpErr } = await (supabase.from as any)("builder_profiles")
        .select("id, builder_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (bpErr) throw bpErr;
      if (!bp) {
        setBuilderName("");
        setProjects([]);
        return;
      }
      setBuilderName(bp.builder_name ?? "");

      const list = await projectService.listProjectsByBuilder(bp.id);
      setProjects(list);

      const statsArr = await Promise.all(
        list.map(async (p) => {
          try { return await projectService.getProjectStats(p.id); }
          catch { return null; }
        }),
      );
      const map: Record<string, ProjectStats> = {};
      statsArr.forEach((s) => { if (s) map[s.project_id] = s; });
      setStatsById(map);
    } catch (err: any) {
      console.error("BuilderProjectsDashboard load error:", err);
      toast({
        title: "Failed to load projects",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
      toast({ title: "Project deleted" });
      setProjects((p) => p.filter((x) => x.id !== pendingDeleteId));
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message ?? "Could not delete project.",
        variant: "destructive",
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">My Projects</h1>
          <p className="text-sm text-white/60">
            {builderName ? `${builderName} • ` : ""}{projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => navigate("/add-project")}
          className="gap-2 bg-emerald-500 text-black hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Add Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={projects.length}
          icon={Building2}
          accent="bg-emerald-500/30"
        />
        <StatCard
          label="Total Units"
          value={aggregate.totalUnits}
          icon={Layers}
          accent="bg-sky-500/30"
        />
        <StatCard
          label="Available Units"
          value={aggregate.availableUnits}
          icon={Home}
          accent="bg-teal-500/30"
        />
        <StatCard
          label="Revenue"
          value={fmtINR(aggregate.revenue)}
          icon={IndianRupee}
          accent="bg-amber-500/30"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-white/5">
          {TAB_OPTIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Projects grid / empty */}
      {filtered.length === 0 ? (
        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-white/40" />
            <p className="text-lg font-medium text-white">No projects found</p>
            <p className="text-sm text-white/60">
              {activeTab === "all"
                ? "Start by adding your first project."
                : `No projects with status "${TAB_OPTIONS.find((t) => t.value === activeTab)?.label}".`}
            </p>
            <Button
              onClick={() => navigate("/add-project")}
              className="mt-2 gap-2 bg-emerald-500 text-black hover:bg-emerald-400"
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
              onView={() => window.open(`/project/${p.id}`, "_blank")}
              onEdit={() => navigate(`/edit-project/${p.id}`)}
              onDelete={() => setPendingDeleteId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the project, its units, and construction updates.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-500 hover:bg-rose-400"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuilderProjectsDashboard;
