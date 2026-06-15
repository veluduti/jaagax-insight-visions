import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

interface Props {
  propertyId: string;
  currentAgentId?: string | null;
  userId: string;
  onRequested?: () => void;
  trigger?: React.ReactNode;
}

export default function SwitchAgentDialog({ propertyId, currentAgentId, userId, onRequested, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) return toast.error("Please provide at least 10 characters of reason");
    setLoading(true);
    const sb: any = supabase;
    // Notify admins
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await sb.from("notifications").insert(
        admins.map((a: any) => ({
          user_id: a.user_id,
          title: "Switch agent request",
          message: `Seller requested an agent change for property ${propertyId}. Reason: ${reason}`,
          type: "alert",
          link: "/admin",
        })),
      );
    }
    // Log to seller activity (best-effort)
    await sb.from("seller_activity_logs").insert({
      user_id: userId,
      action: "switch_agent_request",
      metadata: { property_id: propertyId, current_agent_id: currentAgentId, reason },
    });

    toast.success("Request submitted — our team will review within 24 hours");
    setOpen(false);
    setReason("");
    setLoading(false);
    onRequested?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1">
            <UserCheck className="h-3 w-3" /> Switch Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to switch agent</DialogTitle>
          <DialogDescription>
            Tell us why you want a different agent. Our team reviews each request individually.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={5}
          placeholder="e.g. Unresponsive, no visits scheduled, mismatch in expectations…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {loading ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
