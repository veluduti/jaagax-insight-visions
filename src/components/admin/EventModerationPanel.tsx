import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EventRow, EventStatus, listEventsForReview, reviewEvent, fmtDate, hhmm, inr, eventTypeLabel } from "@/services/eventService";

export function EventModerationPanel() {
  const [tab, setTab] = useState<EventStatus | "all">("pending_approval");
  const [list, setList] = useState<EventRow[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => { setList(null); listEventsForReview(tab).then(setList).catch(() => setList([])); };
  useEffect(load, [tab]);

  const decide = async (e: EventRow, approve: boolean) => {
    const reason = (reasons[e.id] || "").trim();
    if (!approve && reason.length < 5) { toast.error("Write a rejection reason (at least 5 characters)"); return; }
    setBusy(e.id);
    try { await reviewEvent(e.id, approve, reason); toast.success(approve ? "Event approved and published" : "Event rejected — organizer notified by email"); load(); }
    catch (err: any) { toast.error(err.message); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList><TabsTrigger value="pending_approval">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger><TabsTrigger value="cancelled">Cancelled</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
      </Tabs>
      {!list ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : list.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No events here.</CardContent></Card>
      ) : list.map((e) => (
        <Card key={e.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle className="text-lg">{e.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{eventTypeLabel(e.event_type)} · {fmtDate(e.event_date)} · {hhmm(e.start_time)} · {e.venue}{e.city ? `, ${e.city}` : ""}</p>
                <p className="text-xs text-muted-foreground">By {e.organizer_name || "Organizer"}</p></div>
              <Badge variant="outline">{e.status.replace("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {e.image_urls?.length > 0 && <div className="flex gap-2 overflow-x-auto">{e.image_urls.map((u) => <img key={u} src={u} alt="" className="h-20 w-28 object-cover rounded" />)}</div>}
            {e.description && <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">{e.description}</p>}
            <div className="flex flex-wrap gap-2">{(e.tickets || []).map((t) => (
              <Badge key={t.id} variant="secondary">{t.kind.toUpperCase()} · {t.name} · {t.requires_payment && t.price > 0 ? inr(t.price) : "Free"} · {t.quantity} seats</Badge>
            ))}</div>
            <p className="text-xs text-muted-foreground">{e.property_ids?.length || 0} linked properties</p>
            {e.rejection_reason && <p className="text-sm text-destructive">Reason: {e.rejection_reason}</p>}
            <Button asChild variant="link" size="sm" className="px-0"><a href={`/events/${e.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Preview</a></Button>
            {e.status === "pending_approval" && (
              <div className="space-y-2">
                <Textarea rows={2} maxLength={1000} placeholder="Rejection reason (sent to the organizer by email)" value={reasons[e.id] || ""} onChange={(ev) => setReasons({ ...reasons, [e.id]: ev.target.value })} />
                <div className="flex gap-2">
                  <Button disabled={busy === e.id} onClick={() => decide(e, true)}><Check className="h-4 w-4 mr-1" />Approve & publish</Button>
                  <Button variant="destructive" disabled={busy === e.id} onClick={() => decide(e, false)}><X className="h-4 w-4 mr-1" />Reject</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminEventsPage() {
  return <div className="container mx-auto max-w-5xl px-4 py-8 space-y-4"><h1 className="text-2xl font-bold">Event approvals</h1><EventModerationPanel /></div>;
}
