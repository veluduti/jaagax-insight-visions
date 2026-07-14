import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, BellRing } from "lucide-react";
import { toast } from "sonner";

interface Target {
  user_id: string;
  role: string;
  country: string | null;
  state: string | null;
  district: string | null;
  email: string | null;
}

/**
 * Lets a higher admin (global / country / state) pick a lower admin inside their
 * scope and send a reminder. The RPC also emits an in-app notification.
 */
export function RemindAdminDialog({
  open, onOpenChange,
  entityType, entityId,
  defaultTargetUserId,
  defaultMessage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityType?: string;
  entityId?: string;
  defaultTargetUserId?: string | null;
  defaultMessage?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setMessage(defaultMessage || "Please review and take action.");
    (async () => {
      const { data, error } = await (supabase as any).rpc("list_reminder_targets");
      if (!alive) return;
      if (error) toast.error("Couldn't load admins: " + error.message);
      const list = (data ?? []) as Target[];
      setTargets(list);
      setTargetId(defaultTargetUserId || list[0]?.user_id || "");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, defaultTargetUserId, defaultMessage]);

  const send = async () => {
    if (!targetId || !message.trim()) {
      toast.error("Pick an admin and enter a message");
      return;
    }
    setSending(true);
    try {
      const { error } = await (supabase as any).rpc("send_admin_reminder", {
        _to_admin_id: targetId,
        _message: message.trim(),
        _entity_type: entityType ?? null,
        _entity_id: entityId ?? null,
      });
      if (error) throw error;
      toast.success("Reminder sent");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reminder");
    } finally {
      setSending(false);
    }
  };

  const label = (t: Target) => {
    const scope = [t.country, t.state, t.district].filter(Boolean).join(" · ") || "Global";
    return `${t.role.replace("_", " ")} — ${scope}${t.email ? ` (${t.email})` : ""}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Send reminder to admin
          </DialogTitle>
          <DialogDescription>
            Only admins inside your scope are listed. They receive an in-app notification.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : targets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No admins in your scope to remind.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target admin</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {targets.map((t) => (
                  <option key={t.user_id} value={t.user_id}>{label(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please action the pending property submission in your district."
              />
            </div>
            {entityType && (
              <Badge variant="outline" className="text-[10px]">
                Attached to {entityType}{entityId ? ` · ${entityId.slice(0, 8)}` : ""}
              </Badge>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={send} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Send reminder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
