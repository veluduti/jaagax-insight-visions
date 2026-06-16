import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  Edit,
  Download,
  Share2,
  Plus,
  Calendar,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  projectService,
  type Project,
  type ProjectUnit,
  type ConstructionUpdate,
  type ProjectStats,
  type ProjectStatus,
  type UnitStatus,
} from "@/services/projectService";

// ---------- helpers ----------
const fmtINR = (n: number | null | undefined) => {
  if (!n || n <= 0) return "N/A";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
};

const statusConfig: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-slate-500/20 text-slate-200 border-slate-500/40" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
  approved: { label: "Approved", className: "bg-blue-500/20 text-blue-200 border-blue-500/40" },
  launched: { label: "Launched", className: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  under_construction: { label: "Under Construction", className: "bg-orange-500/20 text-orange-200 border-orange-500/40" },
  completed: { label: "Completed", className: "bg-teal-500/20 text-teal-200 border-teal-500/40" },
};

const unitStatusConfig: Record<
  UnitStatus,
  { label: string; card: string; badge: string }
> = {
  available: {
    label: "Available",
    card: "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  },
  booked: {
    label: "Booked",
    card: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  },
  sold: {
    label: "Sold",
    card: "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  },
  reserved: {
    label: "Reserved",
    card: "border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10",
    badge: "bg-sky-500/20 text-sky-200 border-sky-500/40",
  },
};

// ---------- subcomponents ----------
const StatCard = ({
  label,
  value,
  icon: Icon,
  color = "text-emerald-300",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) => (
  <Card className="p-4 bg-slate-900/60 border-slate-700/60 backdrop-blur">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-slate-800/80 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
);

const UnitCard = ({
  unit,
  onClick,
}: {
  unit: ProjectUnit;
  onClick: (u: ProjectUnit) => void;
}) => {
  const cfg = unitStatusConfig[unit.status] ?? unitStatusConfig.available;
  return (
    <button
      type="button"
      onClick={() => onClick(unit)}
      className={`text-left rounded-lg border p-3 transition-all ${cfg.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100">#{unit.unit_number}</p>
          <p className="text-xs text-slate-400">{unit.type ?? "N/A"}</p>
        </div>
        <Badge variant="outline" className={cfg.badge}>
          {cfg.label}
        </Badge>
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-300">
        <p>{unit.area_sqft ? `${unit.area_sqft} sqft` : "N/A"}</p>
        <p className="font-medium text-emerald-300">{fmtINR(unit.price)}</p>
        <p className="text-slate-400">
          {unit.facing ?? "—"} · Floor {unit.floor_number ?? "—"}
        </p>
      </div>
    </button>
  );
};

const UpdateCard = ({
  update,
  onMediaClick,
}: {
  update: ConstructionUpdate;
  onMediaClick: (url: string) => void;
}) => {
  const media = update.media_urls ?? [];
  return (
    <Card className="p-5 bg-slate-900/60 border-slate-700/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-100">{update.title}</h4>
            {update.milestone && (
              <Badge variant="outline" className="bg-teal-500/20 text-teal-200 border-teal-500/40">
                {update.milestone}
              </Badge>
            )}
            {update.is_delay && (
              <Badge variant="outline" className="bg-rose-500/20 text-rose-200 border-rose-500/40">
                <AlertTriangle className="w-3 h-3 mr-1" /> Delay
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{fmtDate(update.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Completion</p>
          <p className="text-lg font-bold text-emerald-300">{update.completion_percentage}%</p>
        </div>
      </div>

      {update.description && (
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">{update.description}</p>
      )}

      {update.is_delay && update.delay_reason && (
        <div className="mt-3 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-sm text-rose-200">
          <span className="font-medium">Delay reason:</span> {update.delay_reason}
        </div>
      )}

      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
          {media.map((url, i) => {
            const isVideo = update.media_type === "drone_video" || /\.(mp4|webm|mov)$/i.test(url);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onMediaClick(url)}
                className="relative aspect-square rounded-md overflow-hidden border border-slate-700 group"
              >
                {isVideo ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Video className="w-6 h-6 text-slate-300" />
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`update-${i}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400";
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// ---------- main component ----------
const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [units, setUnits] = useState<ProjectUnit[]>([]);
  const [updates, setUpdates] = useState<ConstructionUpdate[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<ProjectUnit | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [p, u, c, s] = await Promise.all([
          projectService.getProject(id),
          projectService.listProjectUnits(id),
          projectService.listConstructionUpdates(id),
          projectService.getProjectStats(id),
        ]);
        if (!active) return;
        setProject(p);
        setUnits(u);
        setUpdates(c);
        setStats(s);
      } catch (e: any) {
        toast({
          title: "Failed to load project",
          description: e?.message ?? "Unknown error",
          variant: "destructive",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, toast]);

  const overallProgress = useMemo(() => {
    if (!updates.length) return 0;
    return Math.max(...updates.map((u) => u.completion_percentage ?? 0));
  }, [updates]);

  const counts = useMemo(() => {
    const c = { available: 0, booked: 0, sold: 0, reserved: 0 };
    units.forEach((u) => {
      c[u.status] = (c[u.status] ?? 0) + 1;
    });
    return c;
  }, [units]);

  const totalUnits = stats?.total_units ?? units.length;
  const revenue = stats?.revenue_generated ?? 0;

  const galleryImages = useMemo(() => {
    if (!project) return [];
    return [project.hero_image, project.master_plan_url].filter(
      (x): x is string => !!x,
    );
  }, [project]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: project?.name ?? "Project", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Project link copied to clipboard." });
      }
    } catch {
      // user cancelled
    }
  };

  const handleDownloadBrochure = () => {
    if (!project?.brochure_url) {
      toast({ title: "No brochure", description: "This project has no brochure uploaded.", variant: "destructive" });
      return;
    }
    window.open(project.brochure_url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3">
        <p>Project not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const statusCfg = statusConfig[project.status] ?? statusConfig.draft;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {/* Hero */}
        <Card className="relative overflow-hidden border-slate-700/60 bg-slate-900/60 backdrop-blur">
          {project.hero_image && (
            <div className="absolute inset-0 opacity-30">
              <img
                src={project.hero_image}
                alt={project.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>
          )}
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <Badge variant="outline" className={statusCfg.className}>
                  {statusCfg.label}
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold mt-3 text-white">{project.name}</h1>
                {project.subtitle && (
                  <p className="text-slate-300 mt-1">{project.subtitle}</p>
                )}
                {project.builder_name && (
                  <p className="text-sm text-emerald-300 mt-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> {project.builder_name}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => navigate(`/builder/projects/${project.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={() => navigate(`/builder/projects/${project.id}/update`)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={handleDownloadBrochure}
                >
                  <Download className="w-4 h-4 mr-2" /> Brochure
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Launch
                </p>
                <p className="text-sm font-medium mt-1">{fmtDate(project.launch_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Possession
                </p>
                <p className="text-sm font-medium mt-1">{fmtDate(project.possession_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Land Area</p>
                <p className="text-sm font-medium mt-1">{project.land_area ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Towers / Floors</p>
                <p className="text-sm font-medium mt-1">
                  {project.towers ?? "—"} / {project.floors ?? "—"}
                </p>
              </div>
            </div>

            {updates.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">Overall Construction Progress</p>
                  <p className="text-sm font-semibold text-emerald-300">{overallProgress}%</p>
                </div>
                <Progress value={overallProgress} className="h-2 bg-slate-800" />
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Units" value={totalUnits} icon={Home} color="text-slate-100" />
          <StatCard label="Available" value={counts.available} icon={CheckCircle2} color="text-emerald-300" />
          <StatCard label="Booked" value={counts.booked} icon={Clock} color="text-amber-300" />
          <StatCard label="Sold" value={counts.sold} icon={Home} color="text-rose-300" />
          <StatCard label="Revenue" value={fmtINR(revenue)} icon={Home} color="text-teal-300" />
        </div>

        {/* Units */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Unit Inventory</h2>
            <p className="text-sm text-slate-400">{units.length} units</p>
          </div>
          {units.length === 0 ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-700/60 text-slate-400">
              No units added yet.
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {units.map((u) => (
                <UnitCard key={u.id} unit={u} onClick={setSelectedUnit} />
              ))}
            </div>
          )}
        </section>

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryImages.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl(url)}
                  className="aspect-video rounded-lg overflow-hidden border border-slate-700 group"
                >
                  <img
                    src={url}
                    alt={`gallery-${i}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600";
                    }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Construction timeline */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Construction Timeline</h2>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-100"
              onClick={() => navigate(`/builder/projects/${project.id}/update`)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Update
            </Button>
          </div>
          {updates.length === 0 ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-700/60 text-slate-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No construction updates yet.
            </Card>
          ) : (
            <div className="space-y-4">
              {updates.map((u) => (
                <UpdateCard key={u.id} update={u} onMediaClick={setLightboxUrl} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Unit detail modal */}
      <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && setSelectedUnit(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Unit #{selectedUnit?.unit_number}</DialogTitle>
          </DialogHeader>
          {selectedUnit && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <Badge
                  variant="outline"
                  className={unitStatusConfig[selectedUnit.status].badge}
                >
                  {unitStatusConfig[selectedUnit.status].label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400 text-xs">Type</p>
                  <p>{selectedUnit.type ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Area</p>
                  <p>{selectedUnit.area_sqft ? `${selectedUnit.area_sqft} sqft` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Price</p>
                  <p className="text-emerald-300 font-medium">{fmtINR(selectedUnit.price)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Facing</p>
                  <p>{selectedUnit.facing ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Floor</p>
                  <p>{selectedUnit.floor_number ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Booking Amount</p>
                  <p>{fmtINR(selectedUnit.booking_amount)}</p>
                </div>
              </div>
              {selectedUnit.booked_at && (
                <p className="text-xs text-slate-400">
                  Booked on {fmtDate(selectedUnit.booked_at)}
                </p>
              )}
              {selectedUnit.sold_at && (
                <p className="text-xs text-slate-400">
                  Sold on {fmtDate(selectedUnit.sold_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 max-w-4xl p-2">
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 p-1 text-slate-200 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          {lightboxUrl && (
            /\.(mp4|webm|mov)$/i.test(lightboxUrl) ? (
              <video src={lightboxUrl} controls className="w-full max-h-[80vh] rounded-md" />
            ) : (
              <img
                src={lightboxUrl}
                alt="preview"
                className="w-full max-h-[80vh] object-contain rounded-md"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
