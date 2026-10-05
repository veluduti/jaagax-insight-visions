import type { AccommodationKind } from "@/config/accommodationTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Renders the extra fields defined for one accommodation kind. */
export default function AccommodationFields({ kind, value, onChange }: {
  kind: AccommodationKind; value: Record<string, any>; onChange: (v: Record<string, any>) => void;
}) {
  if (!kind.fields.length) return null;
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <p className="text-sm font-semibold">{kind.label} details</p>
      {kind.fields.map((f) => {
        if (f.kind === "boolean")
          return (
            <div key={f.key} className="flex items-center justify-between">
              <Label>{f.label}</Label>
              <Switch checked={!!value[f.key]} onCheckedChange={(v) => set(f.key, v)} />
            </div>
          );
        if (f.kind === "select" || f.kind === "multi") {
          const cur = value[f.key];
          const list: string[] = Array.isArray(cur) ? cur : [];
          return (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {f.options.map((o) => {
                  const active = f.kind === "multi" ? list.includes(o) : cur === o;
                  return (
                    <button key={o} type="button" className={chip(active)}
                      onClick={() => set(f.key, f.kind === "multi" ? (active ? list.filter((x) => x !== o) : [...list, o]) : o)}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input type={f.kind === "number" ? "number" : "text"} min={0} value={value[f.key] ?? ""}
              onChange={(e) => set(f.key, f.kind === "number" ? (e.target.value === "" ? null : Math.max(0, Number(e.target.value))) : e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}
