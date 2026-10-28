import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  MessageSquareText,
  Loader2,
  Phone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Agent-facing panel for engagement coming from the public profile page:
 * meeting requests (Schedule a Meeting) and contact-form enquiries.
 */

interface MeetingRequest {
  id: string;
  requester_name: string;
  requester_contact: string | null;
  preferred_date: string;
  time_slot: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface Inquiry {
  id: string;
  sender_name: string;
  message: string;
  channel: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-700",
  completed: "bg-muted text-muted-foreground",
};

const AgentEngagementPanel = ({ agentId }: { agentId: string }) => {
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const sb: any = supabase;
    const [{ data: m }, { data: i }] = await Promise.all([
      sb
        .from("agent_meeting_requests")
        .select("id, requester_name, requester_contact, preferred_date, time_slot, message, status, created_at")
        .eq("agent_id", agentId)
        .order("preferred_date", { ascending: true }),
      sb
        .from("agent_inquiries")
        .select("id, sender_name, message, channel, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setMeetings((m as MeetingRequest[]) || []);
    setInquiries((i as Inquiry[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const setStatus = async (id: string, status: string) => {
    setUpdating(id);
    const sb: any = supabase;
    const { error } = await sb
      .from("agent_meeting_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setUpdating(null);
    if (error) return toast.error("Could not update the request.");
    setMeetings((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Meeting ${status}`);
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Meeting requests */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Meeting Requests
            <Badge variant="secondary" className="text-[10px]">
              {meetings.filter((m) => m.status === "pending").length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[380px] space-y-3 overflow-y-auto">
          {meetings.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No meeting requests yet. They appear here when customers book from your public
              profile.
            </p>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{m.requester_name}</p>
                  <Badge className={`text-[10px] ${STATUS_STYLES[m.status] || ""}`}>
                    {m.status}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(m.preferred_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}
                  {m.time_slot}
                </p>
                {m.requester_contact && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {m.requester_contact}
                  </p>
                )}
                {m.message && <p className="text-xs text-foreground/80">{m.message}</p>}
                {m.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      disabled={updating === m.id}
                      onClick={() => setStatus(m.id, "confirmed")}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-xs"
                      disabled={updating === m.id}
                      onClick={() => setStatus(m.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {m.status === "confirmed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full text-xs"
                    disabled={updating === m.id}
                    onClick={() => setStatus(m.id, "completed")}
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Enquiries */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Profile Enquiries
            <Badge variant="secondary" className="text-[10px]">
              {inquiries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[380px] space-y-3 overflow-y-auto">
          {inquiries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No enquiries yet. Messages sent from your public profile appear here.
            </p>
          ) : (
            inquiries.map((q) => (
              <div key={q.id} className="space-y-1 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{q.sender_name}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {q.channel}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{q.message}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(q.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentEngagementPanel;
