import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

type Settings = {
  id: string;
  country_timer_minutes: number;
  state_timer_minutes: number;
  district_timer_minutes: number;
  max_hold_hours: number;
  visit_window_days: number;
  owner_approval_hours: number;
  no_agent_max_hold_hours: number;
  no_agent_review_days_min: number;
  no_agent_review_days_max: number;
  auto_release_enabled: boolean;
};

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "country_timer_minutes", label: "Country admin response time (minutes)", hint: "Countdown each eligible Country Admin gets before escalation." },
  { key: "state_timer_minutes", label: "State admin response time (minutes)", hint: "Countdown for each eligible State Admin." },
  { key: "district_timer_minutes", label: "District admin response time (minutes)", hint: "Countdown for each eligible District Admin." },
  { key: "max_hold_hours", label: "Maximum hold time (hours)", hint: "After this, the hold auto-releases and other timers resume." },
  { key: "visit_window_days", label: "Visit scheduling window (days)", hint: "How soon the holding admin must visit the property." },
  { key: "owner_approval_hours", label: "Owner approval time (hours)", hint: "How long the owner has to approve the verification." },
  { key: "no_agent_max_hold_hours", label: "Hold limit without agent (hours)", hint: "Scenario 2 — owner did not ask for a JAAGAX agent. Hold auto-releases after this." },
  { key: "no_agent_review_days_min", label: "No-agent review estimate — from (days)", hint: "Shown to the owner as the expected review time." },
  { key: "no_agent_review_days_max", label: "No-agent review estimate — to (days)", hint: "Upper bound of the estimate shown to the owner." },
];

export default function WorkflowSettingsPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("workflow_settings").select("*").limit(1).maybeSingle();
      setS(data as Settings);
    })();
  }, []);

  if (!s) return <Skeleton className="h-64 w-full" />;

  const save = async () => {
    setSaving(true);
    const { id, ...rest } = s;
    const { error } = await (supabase as any).from("workflow_settings").update(rest).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Workflow rules updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />Verification workflow rules</CardTitle>
        <CardDescription>
          Controls the Country → State → District escalation engine for every property submitted on JAAGAX.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                min={1}
                value={Number(s[f.key])}
                onChange={(e) => setS({ ...s, [f.key]: Number(e.target.value) })}
              />
              <p className="text-[11px] text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">Auto-release expired holds</div>
            <p className="text-[11px] text-muted-foreground">
              Unlock the property and resume the remaining admin timers when a hold runs out.
            </p>
          </div>
          <Switch checked={s.auto_release_enabled} onCheckedChange={(v) => setS({ ...s, auto_release_enabled: v })} />
        </div>

        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save workflow rules"}</Button>
      </CardContent>
    </Card>
  );
}
