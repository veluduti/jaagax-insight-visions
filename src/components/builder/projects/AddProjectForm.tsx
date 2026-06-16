import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Layers, Image as ImageIcon, FileText, Plus, Trash2,
  Loader2, Compass, Home, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FileUploadField from "@/components/builder/form/FileUploadField";
import {
  projectService,
  type Project,
  type ProjectStatus,
  type ProjectUnit,
  type UnitStatus,
} from "@/services/projectService";

// ---------- Constants ----------
const STATUS_OPTIONS: ProjectStatus[] = [
  "draft", "pending_approval", "approved", "launched", "under_construction", "completed",
];

const UNIT_TYPES = ["2 BHK", "3 BHK", "4 BHK", "5 BHK", "Villa", "Penthouse", "Studio"];
const BHK_OPTIONS = ["2 BHK", "3 BHK", "4 BHK", "5 BHK", "Villa", "Penthouse", "Studio"];
const FACING_OPTIONS = [
  "East", "West", "North", "South",
  "North-East", "North-West", "South-East", "South-West",
];
const UNIT_STATUSES: UnitStatus[] = ["available", "booked", "sold", "reserved"];

interface UnitDraft {
  id?: string;
  unit_number: string;
  type: string;
  area_sqft: number | null;
  price: number | null;
  facing: string;
  floor_number: number | null;
  status: UnitStatus;
}

const emptyUnit = (): UnitDraft => ({
  unit_number: "",
  type: "3 BHK",
  area_sqft: null,
  price: null,
  facing: "East",
  floor_number: null,
  status: "available",
});

interface AddProjectFormProps {
  editId?: string;
}

const AddProjectForm = ({ editId }: AddProjectFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState<string>("");

  const [form, setForm] = useState<Partial<Project>>({
    name: "",
    subtitle: "",
    description: "",
    status: "draft",
    launch_date: null,
    possession_date: null,
    total_units: null,
    floors: "",
    towers: null,
    land_area: "",
    size_range: "",
    bhk_types: "",
    hero_image: "",
    master_plan_url: "",
    brochure_url: "",
  });

  const [selectedBhk, setSelectedBhk] = useState<string[]>([]);
  const [units, setUnits] = useState<UnitDraft[]>([emptyUnit()]);

  // ---------- Helpers ----------
  const updateField = <K extends keyof Project>(key: K, value: Project[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleBhk = (bhk: string) =>
    setSelectedBhk((prev) =>
      prev.includes(bhk) ? prev.filter((b) => b !== bhk) : [...prev, bhk],
    );

  const addUnit = () => setUnits((u) => [...u, emptyUnit()]);
  const removeUnit = (index: number) => {
    if (units.length <= 1) return;
    setUnits((u) => u.filter((_, i) => i !== index));
  };
  const updateUnit = <K extends keyof UnitDraft>(index: number, key: K, value: UnitDraft[K]) =>
    setUnits((u) => u.map((unit, i) => (i === index ? { ...unit, [key]: value } : unit)));

  // ---------- Bootstrap: builder profile + edit data ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Sign in required",
            description: "Please sign in as a builder to create projects.",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        const { data: bp, error: bpError } = await (supabase.from as any)("builder_profiles")
          .select("id, builder_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (bpError) throw bpError;
        if (!bp) {
          toast({
            title: "Builder profile missing",
            description: "Create your builder profile before adding projects.",
            variant: "destructive",
          });
          navigate("/builder/profile/new");
          return;
        }
        if (cancelled) return;
        setBuilderProfileId(bp.id);
        setBuilderName(bp.builder_name ?? "");

        if (editId) {
          const project = await projectService.getProject(editId);
          if (project && !cancelled) {
            setForm({
              name: project.name ?? "",
              subtitle: project.subtitle ?? "",
              description: project.description ?? "",
              status: project.status ?? "draft",
              launch_date: project.launch_date ?? null,
              possession_date: project.possession_date ?? null,
              total_units: project.total_units ?? null,
              floors: project.floors ?? "",
              towers: project.towers ?? null,
              land_area: project.land_area ?? "",
              size_range: project.size_range ?? "",
              bhk_types: project.bhk_types ?? "",
              hero_image: project.hero_image ?? "",
              master_plan_url: project.master_plan_url ?? "",
              brochure_url: project.brochure_url ?? "",
            });
            setSelectedBhk(
              (project.bhk_types ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
            const existingUnits = await projectService.listProjectUnits(editId);
            if (existingUnits.length && !cancelled) {
              setUnits(
                existingUnits.map((u) => ({
                  id: u.id,
                  unit_number: u.unit_number ?? "",
                  type: u.type ?? "3 BHK",
                  area_sqft: u.area_sqft,
                  price: u.price,
                  facing: u.facing ?? "East",
                  floor_number: u.floor_number,
                  status: u.status ?? "available",
                })),
              );
            }
          }
        }
      } catch (err: any) {
        console.error("AddProjectForm bootstrap error:", err);
        toast({
          title: "Failed to load",
          description: err?.message ?? "Could not initialise the form.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, navigate, toast]);

  // ---------- Submit ----------
  const validate = (): string | null => {
    if (!form.name?.trim()) return "Project name is required.";
    if (!units.length) return "At least one unit is required.";
    const invalid = units.find((u) => !u.unit_number.trim());
    if (invalid) return "Each unit needs a unit number.";
    if (!builderProfileId) return "Builder profile not found.";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast({ title: "Check the form", description: error, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: Partial<Project> = {
        ...form,
        builder_profile_id: builderProfileId,
        builder_name: builderName || form.builder_name || null,
        bhk_types: selectedBhk.join(", "),
      };

      const project = editId
        ? await projectService.updateProject(editId, payload)
        : await projectService.createProject(payload);

      // Sync units: delete existing then insert fresh set (simplest reliable sync)
      if (editId) {
        const existing = await projectService.listProjectUnits(project.id);
        await Promise.all(existing.map((u) => projectService.deleteProjectUnit(u.id)));
      }
      await projectService.bulkCreateProjectUnits(
        units.map((u) => ({
          project_id: project.id,
          unit_number: u.unit_number,
          type: u.type,
          area_sqft: u.area_sqft,
          price: u.price,
          facing: u.facing,
          floor_number: u.floor_number,
          status: u.status,
        })),
      );

      toast({
        title: editId ? "Project updated" : "Project created",
        description: `${project.name} saved successfully.`,
      });
      navigate("/builder/projects");
    } catch (err: any) {
      console.error("AddProjectForm submit error:", err);
      toast({
        title: "Save failed",
        description: err?.message ?? "Could not save the project.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Derived counts ----------
  const counts = units.reduce(
    (acc, u) => {
      acc[u.status] = (acc[u.status] ?? 0) + 1;
      return acc;
    },
    { available: 0, booked: 0, sold: 0, reserved: 0 } as Record<UnitStatus, number>,
  );

  if (bootstrapping) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            {editId ? "Edit Project" : "Add New Project"}
          </h1>
          <p className="text-sm text-white/60">
            {builderName ? `Builder: ${builderName}` : "Fill in the details below."}
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
          {form.status}
        </Badge>
      </div>

      {/* 1. Project Details */}
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-emerald-400" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Project Name *</label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Prestige Lakeside Habitat"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Subtitle</label>
              <Input
                value={form.subtitle ?? ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
                placeholder="A short tagline"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-white/80">Description</label>
            <Textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the project, lifestyle and unique features"
            />
          </div>
          <div className="space-y-1.5 md:w-1/2">
            <label className="text-sm text-white/80">Status</label>
            <Select
              value={form.status ?? "draft"}
              onValueChange={(v) => updateField("status", v as ProjectStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 2. Specifications */}
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Layers className="h-5 w-5 text-emerald-400" />
            Project Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Launch Date</label>
              <Input
                type="date"
                value={form.launch_date ?? ""}
                onChange={(e) => updateField("launch_date", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Possession Date</label>
              <Input
                type="date"
                value={form.possession_date ?? ""}
                onChange={(e) => updateField("possession_date", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Total Units</label>
              <Input
                type="number"
                value={form.total_units ?? ""}
                onChange={(e) =>
                  updateField("total_units", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Floors</label>
              <Input
                value={form.floors ?? ""}
                onChange={(e) => updateField("floors", e.target.value)}
                placeholder="e.g. G+25"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Towers</label>
              <Input
                type="number"
                value={form.towers ?? ""}
                onChange={(e) =>
                  updateField("towers", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/80">Land Area</label>
              <Input
                value={form.land_area ?? ""}
                onChange={(e) => updateField("land_area", e.target.value)}
                placeholder="e.g. 5.5 Acres"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm text-white/80">Size Range</label>
              <Input
                value={form.size_range ?? ""}
                onChange={(e) => updateField("size_range", e.target.value)}
                placeholder="e.g. 1,250–2,200 Sft"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/80">BHK Types</label>
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map((bhk) => {
                const active = selectedBhk.includes(bhk);
                return (
                  <Badge
                    key={bhk}
                    onClick={() => toggleBhk(bhk)}
                    className={`cursor-pointer border px-3 py-1 transition ${
                      active
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                        : "border-white/20 bg-transparent text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {active && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {bhk}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Unit Inventory */}
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-white">
            <Home className="h-5 w-5 text-emerald-400" />
            Unit Inventory
          </CardTitle>
          <Button size="sm" onClick={addUnit} variant="outline" className="gap-1">
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-white/70">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
              Available: {counts.available}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300">
              Booked: {counts.booked}
            </Badge>
            <Badge variant="outline" className="border-rose-500/40 text-rose-300">
              Sold: {counts.sold}
            </Badge>
            <Badge variant="outline" className="border-sky-500/40 text-sky-300">
              Reserved: {counts.reserved}
            </Badge>
          </div>

          {units.map((unit, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 md:grid-cols-7"
            >
              <div className="md:col-span-1">
                <label className="text-xs text-white/60">Unit #</label>
                <Input
                  value={unit.unit_number}
                  onChange={(e) => updateUnit(idx, "unit_number", e.target.value)}
                  placeholder="A-101"
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-white/60">Type</label>
                <Select value={unit.type} onValueChange={(v) => updateUnit(idx, "type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/60">Area (sqft)</label>
                <Input
                  type="number"
                  value={unit.area_sqft ?? ""}
                  onChange={(e) =>
                    updateUnit(idx, "area_sqft", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Price</label>
                <Input
                  type="number"
                  value={unit.price ?? ""}
                  onChange={(e) =>
                    updateUnit(idx, "price", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
              <div>
                <label className="text-xs text-white/60 flex items-center gap-1">
                  <Compass className="h-3 w-3" /> Facing
                </label>
                <Select value={unit.facing} onValueChange={(v) => updateUnit(idx, "facing", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FACING_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/60">Floor</label>
                <Input
                  type="number"
                  value={unit.floor_number ?? ""}
                  onChange={(e) =>
                    updateUnit(idx, "floor_number", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-white/60">Status</label>
                  <Select
                    value={unit.status}
                    onValueChange={(v) => updateUnit(idx, "status", v as UnitStatus)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUnit(idx)}
                  disabled={units.length <= 1}
                  className="text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Media */}
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ImageIcon className="h-5 w-5 text-emerald-400" />
            Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadField
            label="Hero Image"
            value={form.hero_image ?? ""}
            onChange={(url) => updateField("hero_image", url)}
            folder="project-hero"
          />
          <FileUploadField
            label="Master Plan Image"
            value={form.master_plan_url ?? ""}
            onChange={(url) => updateField("master_plan_url", url)}
            folder="master-plans"
          />
          <FileUploadField
            label="Brochure (PDF)"
            value={form.brochure_url ?? ""}
            onChange={(url) => updateField("brochure_url", url)}
            folder="brochures"
            accept="application/pdf"
            preview="file"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-10">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="gap-2 bg-emerald-500 text-black hover:bg-emerald-400"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <FileText className="h-4 w-4" />
          {editId ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </div>
  );
};

export default AddProjectForm;
