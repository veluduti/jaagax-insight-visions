import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Briefcase, Clock, CheckCheck, Star } from "lucide-react";

interface Agent {
  agent_id: string;
  agent_name: string;
  agent_phone: string | null;
  agent_city: string | null;
  distance_km: number | null;
  active_tasks: number;
  pending_tasks: number;
  completed_verifications: number;
  avg_rating: number;
}

export function AssignAgentDialog({
  propertyId,
  propertyTitle,
  open,
  onOpenChange,
  onAssigned,
}: {
  propertyId: string;
  propertyTitle: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAssigned?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .rpc("get_nearby_agents_for_property", { _property_id: propertyId, _radius_km: 50, _limit: 30 });
      if (cancelled) return;
      if (error) toast({ title: "Failed to load agents", description: error.message, variant: "destructive" });
      else setAgents((data ?? []) as Agent[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, propertyId]);

  const assign = async (agentId: string) => {
    setAssigning(agentId);
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          assigned_agent_id: agentId,
          lifecycle_status: "agent_assigned" as any,
        } as any)
        .eq("id", propertyId);
      if (error) throw error;

      // Notify the agent (look up auth user_id) + owner
      const { data: agentRow } = await supabase
        .from("agents").select("user_id").eq("id", agentId).maybeSingle();
      const agentUserId = (agentRow as any)?.user_id as string | undefined;

      const { data: prop } = await supabase
        .from("properties").select("submitted_by, title").eq("id", propertyId).maybeSingle();
      const notifs: any[] = [];
      if (agentUserId) {
        notifs.push({ user_id: agentUserId, title: "New verification task", message: `You've been assigned to verify "${prop?.title ?? propertyTitle}". Accept or reject from your dashboard.`, type: "alert", link: "/dashboard/agent" });
      }
      if (prop?.submitted_by) {
        notifs.push({ user_id: prop.submitted_by, title: "Verification agent assigned", message: `An agent has been assigned to verify "${prop.title}". You can still edit until they accept.`, type: "info", link: "/dashboard/seller" });
      }
      if (notifs.length) await supabase.from("notifications").insert(notifs);

      toast({ title: "Agent assigned" });
      onAssigned?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign verification agent — {propertyTitle}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No verified agents found nearby.</p>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <div key={a.agent_id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.agent_name}</div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.distance_km != null ? `${a.distance_km} km` : "Distance N/A"}{a.agent_city ? ` • ${a.agent_city}` : ""}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{a.active_tasks} active</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.pending_tasks} pending</span>
                    <span className="flex items-center gap-1"><CheckCheck className="w-3 h-3" />{a.completed_verifications} done</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{Number(a.avg_rating).toFixed(1)}</span>
                  </div>
                </div>
                <Button size="sm" disabled={assigning === a.agent_id} onClick={() => assign(a.agent_id)}>
                  {assigning === a.agent_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
