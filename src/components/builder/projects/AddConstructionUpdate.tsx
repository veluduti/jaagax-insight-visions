import { useEffect, useState } from "react";
import { Loader2, Save, X, Camera, Plane, Flag, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiFileUploadField from "@/components/builder/form/MultiFileUploadField";
import { useToast } from "@/hooks/use-toast";
import {
  projectService,
  type ConstructionUpdate,
  type ConstructionMediaType,
} from "@/services/projectService";

interface AddConstructionUpdateProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

const MEDIA_TYPES: { value: ConstructionMediaType; label: string; icon: React.ElementType }[] = [
  { value: "photo", label: "Photo", icon: Camera },
  { value: "drone_video", label: "Drone Video", icon: Plane },
  { value: "milestone", label: "Milestone", icon: Flag },
];

const MILESTONE_OPTIONS = [
  "Foundation Complete",
  "Structural Framing",
  "Roofing Complete",
  "External Finishing",
  "Internal Finishing",
  "Plumbing Complete",
  "Electrical Complete",
  "Landscaping Complete",
  "Ready for Possession",
];

const AddConstructionUpdate = ({
  projectId,
  onSuccess,
  onCancel,
  editId,
}: AddConstructionUpdateProps) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<ConstructionMediaType>("photo");
  const [completion, setCompletion] = useState(0);
  const [milestone, setMilestone] = useState<string>("");
  const [isDelay, setIsDelay] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  // Load existing update for edit mode
  useEffect(() => {
    if (!editId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const all = await projectService.listConstructionUpdates(projectId);
        const existing = all.find((u) => u.id === editId);
        if (!active || !existing) return;
        setTitle(existing.title ?? "");
        setDescription(existing.description ?? "");
        setMediaType((existing.media_type as ConstructionMediaType) ?? "photo");
        setCompletion(existing.completion_percentage ?? 0);
        setMilestone(existing.milestone ?? "");
        setIsDelay(!!existing.is_delay);
        setDelayReason(existing.delay_reason ?? "");
        setMediaUrls(existing.media_urls ?? []);
      } catch (e: any) {
        toast({
          title: "Failed to load update",
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
  }, [editId, projectId, toast]);

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required.";
    if (mediaUrls.length === 0) return "Please upload at least one media file.";
    if (completion < 0 || completion > 100) return "Completion must be between 0 and 100.";
    if (isDelay && !delayReason.trim()) return "Please describe the delay reason.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Missing info", description: err, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<ConstructionUpdate> = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        media_type: mediaType,
        media_urls: mediaUrls,
        completion_percentage: Math.round(completion),
        milestone: milestone || null,
        is_delay: isDelay,
        delay_reason: isDelay ? delayReason.trim() || null : null,
      };

      if (editId) {
        await projectService.updateConstructionUpdate(editId, payload);
        toast({ title: "Update saved", description: "Construction update updated." });
      } else {
        await projectService.createConstructionUpdate(payload);
        toast({ title: "Update posted", description: "New construction update added." });
      }

      onSuccess?.();
    } catch (e: any) {
      toast({
        title: editId ? "Failed to save" : "Failed to post",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5 sm:p-6 bg-slate-900/60 border-slate-700/60 backdrop-blur space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {editId ? "Edit Construction Update" : "Add Construction Update"}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Share progress, milestones, or delays with stakeholders.
          </p>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="cu-title" className="text-slate-200">
            Title <span className="text-rose-400">*</span>
          </Label>
          <Input
            id="cu-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Tower B foundation poured"
            className="bg-slate-800/60 border-slate-700 text-slate-100"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="cu-desc" className="text-slate-200">
            Description
          </Label>
          <Textarea
            id="cu-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief details of the work completed this week…"
            className="bg-slate-800/60 border-slate-700 text-slate-100"
          />
        </div>

        {/* Media type */}
        <div className="space-y-2">
          <Label className="text-slate-200">Media Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {MEDIA_TYPES.map((opt) => {
              const Icon = opt.icon;
              const active = mediaType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMediaType(opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                    active
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Completion Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={completion}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  setCompletion(Math.min(100, Math.max(0, v)));
                }}
                className="w-20 bg-slate-800/60 border-slate-700 text-slate-100"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          </div>
          <Slider
            value={[completion]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => setCompletion(v[0] ?? 0)}
          />
        </div>

        {/* Milestone */}
        <div className="space-y-2">
          <Label className="text-slate-200">Milestone</Label>
          <Select value={milestone || undefined} onValueChange={(v) => setMilestone(v)}>
            <SelectTrigger className="bg-slate-800/60 border-slate-700 text-slate-100">
              <SelectValue placeholder="Select a milestone (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
              {MILESTONE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <div>
                <Label htmlFor="cu-delay" className="text-slate-200">
                  Mark as delayed
                </Label>
                <p className="text-xs text-slate-400">Flag this update if work is behind schedule.</p>
              </div>
            </div>
            <Switch id="cu-delay" checked={isDelay} onCheckedChange={setIsDelay} />
          </div>

          {isDelay && (
            <div className="space-y-2">
              <Label htmlFor="cu-delay-reason" className="text-slate-200">
                Delay Reason <span className="text-rose-400">*</span>
              </Label>
              <Textarea
                id="cu-delay-reason"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                rows={3}
                placeholder="Explain the cause of the delay…"
                className="bg-slate-800/60 border-slate-700 text-slate-100"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Media uploads */}
      <Card className="p-5 sm:p-6 bg-slate-900/60 border-slate-700/60 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Media</h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload photos or drone videos. At least one file is required.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {mediaUrls.length} file{mediaUrls.length === 1 ? "" : "s"}
          </span>
        </div>

        <MultiFileUploadField
          label="Construction Media"
          values={mediaUrls}
          onChange={setMediaUrls}
          folder="construction-updates"
          accept={mediaType === "drone_video" ? "video/*" : "image/*,video/*"}
          placeholder="Paste media URL and press Enter"
        />

        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaUrls.map((url, i) => {
              const isVideo = /\.(mp4|webm|mov)$/i.test(url) || mediaType === "drone_video";
              return (
                <div
                  key={`${url}-${i}`}
                  className="relative aspect-square rounded-md overflow-hidden border border-slate-700 bg-slate-800"
                >
                  {isVideo ? (
                    <video src={url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img
                      src={url}
                      alt={`media-${i}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400";
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrls(mediaUrls.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-slate-200 hover:bg-rose-500/80"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-slate-100"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {editId ? "Save Changes" : "Post Update"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddConstructionUpdate;
