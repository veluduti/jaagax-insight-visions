import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, UserCheck } from "lucide-react";

type AgentRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  phone: string | null;
  trust_score: number | null;
  verified: boolean | null;
};

export default function AssignAgentDialog({
  property,
  open,
  onOpenChange,
  onAssigned,
}: {
  property: { id: string; title?: string | null; city?: string | null; district?: string | null; state?: string | null } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssigned?: () => void;
}) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !property) return;
    (async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("agents")
        .select("id, user_id, name, city, district, state, phone, trust_score, verified")
        .not("user_id", "is", null)
        .limit(50);
      if (property.district) query = query.eq("district", property.district);
      let { data } = await query;
      if (!data || data.length === 0) {
        const fallback = (supabase as any)
          .from("agents")
          .select("id, user_id, name, city, district, state, phone, trust_score, verified")
          .not("user_id", "is", null)
          .limit(50);
        data = (await (property.state ? fallback.eq("state", property.state) : fallback)).data;
      }
      setAgents((data ?? []) as AgentRow[]);
      setLoading(false);
    })();
  }, [open, property]);

  const filtered = agents.filter((a) =>
    !q.trim() || [a.name, a.city, a.district, a.phone].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const assign = async (a: AgentRow) => {
    if (!property || !a.user_id) return;
    setBusy(a.id);
    try {
      const { error } = await (supabase as any).rpc("property_assign_agent", {
        _property_id: property.id,
        _agent_user_id: a.user_id,
      });
      if (error) throw error;
      toast.success(`Assigned to ${a.name ?? "agent"}`);
      onOpenChange(false);
      onAssigned?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Assignment failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a verification agent</DialogTitle>
          <DialogDescription>
            Agents in {property?.district || property?.state || "your scope"} first. The agent must accept within the
            response window or the assignment is cancelled automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, city or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading agents…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents found for this location.</p>
          ) : filtered.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  {a.name || "Unnamed agent"}
                  {a.verified && <Badge variant="secondary" className="text-[10px]">Verified</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[a.city, a.district].filter(Boolean).join(", ") || "Location not set"}
                  {a.trust_score != null ? ` · Trust ${a.trust_score}` : ""}
                </div>
              </div>
              <Button size="sm" disabled={busy === a.id} onClick={() => assign(a)}>
                <UserCheck className="h-4 w-4 mr-1" /> Assign
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
