import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function AgentAssignmentActions({ propertyId, onChanged }: { propertyId: string; onChanged?: () => void }) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const call = async (fn: "agent-accept-assignment" | "agent-reject-assignment", body: any) => {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
  };

  const handleAccept = async () => {
    setBusy("accept");
    try {
      await call("agent-accept-assignment", { property_id: propertyId });
      toast({ title: "Assignment accepted" });
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { toast({ title: "Reason required", variant: "destructive" }); return; }
    setBusy("reject");
    try {
      await call("agent-reject-assignment", { property_id: propertyId, reason: reason.trim() });
      toast({ title: "Assignment rejected" });
      setShowReject(false); setReason("");
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (showReject) {
    return (
      <div className="space-y-2">
        <Textarea placeholder="Reason for rejecting…" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={busy === "reject"} onClick={handleReject}>
            {busy === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm reject"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={busy === "accept"} onClick={handleAccept}>
        {busy === "accept" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>Reject</Button>
    </div>
  );
}
