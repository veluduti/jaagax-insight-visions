import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const STAGES = ["enquiry", "discussion", "onboarding", "approved", "live", "rejected"];

export default function PartnershipEnquiriesPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("partnership_enquiries").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error("Could not load enquiries");
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { id, stage, relationship_manager, commercial_model, integration_requirements, onboarding_progress, admin_notes } = edit;
    const { error } = await (supabase as any).from("partnership_enquiries").update({
      stage, relationship_manager, commercial_model, integration_requirements,
      onboarding_progress: Math.max(0, Math.min(100, Number(onboarding_progress) || 0)), admin_notes,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Enquiry updated"); setEdit(null); load();
  };

  const shown = filter === "all" ? rows : rows.filter((r) => r.stage === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", ...STAGES].map((s) => <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s} ({s === "all" ? rows.length : rows.filter((r) => r.stage === s).length})</Button>)}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : shown.length === 0 ? <p className="text-sm text-muted-foreground">No partnership enquiries yet.</p> : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{r.reference} · {r.company_name}</p>
                  <p className="text-xs text-muted-foreground">{r.full_name} · {r.email} · {r.mobile} · {r.cities}</p>
                  <p className="text-xs text-muted-foreground">{r.partnership_type}{r.partner_category ? ` · ${r.partner_category}` : ""} · {new Date(r.created_at).toLocaleString()}</p>
                  {r.message && <p className="mt-1 text-sm">{r.message}</p>}</div>
                <div className="flex items-center gap-2"><Badge variant="secondary">{r.stage}</Badge><span className="text-xs">{r.onboarding_progress}%</span>
                  <Button size="sm" variant="outline" onClick={() => setEdit({ ...r })}>Manage</Button></div>
              </div>
              {edit?.id === r.id && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="text-xs">Stage<select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label className="text-xs">Relationship manager<Input value={edit.relationship_manager ?? ""} onChange={(e) => setEdit({ ...edit, relationship_manager: e.target.value })} /></label>
                  <label className="text-xs">Commercial model<Input value={edit.commercial_model ?? ""} placeholder="e.g. 15% commission" onChange={(e) => setEdit({ ...edit, commercial_model: e.target.value })} /></label>
                  <label className="text-xs">Onboarding progress (%)<Input type="number" min={0} max={100} value={edit.onboarding_progress} onChange={(e) => setEdit({ ...edit, onboarding_progress: e.target.value })} /></label>
                  <label className="text-xs md:col-span-2">Integration requirements<Textarea value={edit.integration_requirements ?? ""} onChange={(e) => setEdit({ ...edit, integration_requirements: e.target.value })} /></label>
                  <label className="text-xs md:col-span-2">Admin notes<Textarea value={edit.admin_notes ?? ""} onChange={(e) => setEdit({ ...edit, admin_notes: e.target.value })} /></label>
                  <div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
