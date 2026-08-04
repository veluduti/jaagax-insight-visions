import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";
import { PROJECT_TYPES, emptyDraft, type ProjectDraft } from "./projectExperience";

interface Props {
  value: ProjectDraft[];
  onChange: (next: ProjectDraft[]) => void;
}

/**
 * Repeatable "Project Experience" editor. Lives at module scope so the inputs
 * never remount (which would drop keyboard focus between keystrokes).
 */
const ProjectExperienceEditor = ({ value, onChange }: Props) => {
  const items = value.length ? value : [emptyDraft()];

  const patch = (id: string, p: Partial<ProjectDraft>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Project Experience</Label>

      {items.map((p, i) => (
        <Card key={p.id} className="rounded-xl border-border/60 bg-muted/20 shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === 0}
                  aria-label="Move project up"
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === items.length - 1}
                  aria-label="Move project down"
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-destructive hover:text-destructive"
                    onClick={() => remove(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Project Name</Label>
              <Input
                value={p.project_name}
                placeholder="e.g. Prestige Lakeside Habitat"
                onChange={(e) => patch(p.id, { project_name: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Project Type</Label>
                <Select
                  value={p.project_type || undefined}
                  onValueChange={(v) => patch(p.id, { project_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="z-[1100]">
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={p.experience_years}
                  placeholder="0"
                  onChange={(e) => patch(p.id, { experience_years: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Project Location</Label>
              <InlineLocationSearch
                variant="box"
                persistSavedLocation={false}
                placeholder="Search city, locality or address…"
                initialValue={p.project_location}
                onTextChange={(t) => patch(p.id, { project_location: t })}
                onSelected={(loc) =>
                  patch(p.id, {
                    project_location: [loc.locality, loc.city].filter(Boolean).join(", ") || "",
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => onChange([...items, emptyDraft()])}
      >
        <Plus className="h-4 w-4" /> Add Another Project
      </Button>
    </div>
  );
};

export default ProjectExperienceEditor;
