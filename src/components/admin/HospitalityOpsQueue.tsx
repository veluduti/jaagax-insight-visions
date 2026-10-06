import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldAlert, LifeBuoy, IndianRupee, Scale, UserCheck } from "lucide-react";
import { toast } from "sonner";
import AssistantPanel from "@/components/hospitality/AssistantPanel";
import {
  loadQueue, loadUpdates, addUpdate, updateTicket, assignToMe, KIND_LABEL,
  type Ticket, type TicketKind, type TicketUpdate,
} from "@/services/hospitality/ticketService";

const ICON: Record<TicketKind, any> = { support: LifeBuoy, refund: IndianRupee, dispute: Scale, safety: ShieldAlert };
type View = "mine" | "unassigned" | "safety" | "money" | "resolved";

/** JAAGA Ops work queue: support, refunds, disputes and safety reports, most urgent first. */
export default function HospitalityOpsQueue() {
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [view, setView] = useState<View>("unassigned");
  const [open, setOpen] = useState<Ticket | null>(null);

  const load = useCallback(() => loadQueue().then(setRows).catch((e) => toast.error(e.message)), []);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load();
    const ch = supabase.channel("ops_tickets").on("postgres_changes", { event: "*", schema: "public", table: "hospitality_tickets" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const views = useMemo(() => {
    const r = rows ?? []; const active = r.filter((t) => t.status !== "resolved");
    return {
      mine: active.filter((t) => t.assigned_to === me),
      unassigned: active.filter((t) => !t.assigned_to),
      safety: active.filter((t) => t.kind === "safety"),
      money: active.filter((t) => t.kind === "refund" || t.kind === "dispute"),
      resolved: r.filter((t) => t.status === "resolved").slice(0, 50),
    } as Record<View, Ticket[]>;
  }, [rows, me]);

  const labels: Record<View, string> = { unassigned: "Needs an owner", mine: "Assigned to me", safety: "Safety", money: "Refunds & disputes", resolved: "Resolved" };

  return (
    <div className="space-y-3">
      <AssistantPanel role="admin" title="Ask how to handle a case" />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as View[]).map((v) => (
          <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
            {labels[v]} ({views[v].length})
          </Button>
        ))}
      </div>
      {!rows ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> :
        views[view].length === 0 ? <p className="text-sm text-muted-foreground">Nothing here. Good work.</p> :
        views[view].map((t) => {
          const I = ICON[t.kind] ?? LifeBuoy;
          return (
            <Card key={t.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex items-start gap-2">
                <I className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">{KIND_LABEL[t.kind]} · {new Date(t.created_at).toLocaleString("en-IN")}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {t.priority !== "normal" && <Badge variant="destructive" className="capitalize">{t.priority}</Badge>}
                <Badge variant="secondary" className="capitalize">{t.status.replace("_", " ")}</Badge>
                {!t.assigned_to && t.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => assignToMe(t.id).then(load).catch((e) => toast.error(e.message))}><UserCheck className="mr-1 h-4 w-4" />Take it</Button>}
                <Button size="sm" onClick={() => setOpen(t)}>Open</Button>
              </div>
            </CardContent></Card>
          );
        })}
      {open && <TicketDialog ticket={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function TicketDialog({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState(ticket.resolution ?? "");
  const [refund, setRefund] = useState(ticket.refund_amount ? String(ticket.refund_amount) : "");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => loadUpdates(ticket.id).then(setUpdates), [ticket.id]);
  useEffect(() => {
    load();
    if (ticket.booking_id) (supabase as any).from("hotel_bookings").select("hotel_name,guest_name,check_in,check_out,status,payment_status,total_amount,booking_reference").eq("id", ticket.booking_id).maybeSingle().then(({ data }: any) => setBooking(data));
  }, [load, ticket.booking_id]);

  const act = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true); try { await fn(); toast.success(msg); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{ticket.subject}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">{KIND_LABEL[ticket.kind]} · priority {ticket.priority}</p>
        {ticket.body && <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>}
        {booking && (
          <div className="rounded-md border border-border p-2 text-xs">
            {booking.hotel_name} · {booking.guest_name} · {booking.check_in} → {booking.check_out} · {booking.status}/{booking.payment_status} · ₹{Number(booking.total_amount ?? 0).toLocaleString("en-IN")}
          </div>
        )}
        <div className="space-y-2">
          {updates.map((u) => (
            <div key={u.id} className={`rounded-md p-2 text-sm ${u.internal ? "border border-dashed border-border" : "bg-muted"}`}>
              <div className="text-[11px] text-muted-foreground">{u.internal ? "Internal note" : u.author_role === "customer" ? "Customer" : "JAAGA"} · {new Date(u.created_at).toLocaleString("en-IN")}</div>
              {u.body}
            </div>
          ))}
        </div>
        <Textarea placeholder="Write a reply or internal note" value={reply} onChange={(e) => setReply(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || !reply.trim()} onClick={() => act(async () => { await addUpdate(ticket.id, reply.trim(), { role: "jaaga" }); await updateTicket(ticket.id, { status: "waiting" }); setReply(""); load(); }, "Reply sent")}>Reply to customer</Button>
          <Button size="sm" variant="outline" disabled={busy || !reply.trim()} onClick={() => act(async () => { await addUpdate(ticket.id, reply.trim(), { internal: true, role: "jaaga" }); setReply(""); load(); }, "Note saved")}>Internal note</Button>
        </div>
        <div className="grid gap-2 border-t border-border pt-3">
          <Textarea placeholder="How was this resolved?" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          {(ticket.kind === "refund" || ticket.kind === "dispute") && (
            <Input type="number" placeholder="Approved refund amount (₹), optional" value={refund} onChange={(e) => setRefund(e.target.value)} />
          )}
          <Button disabled={busy || !resolution.trim()} onClick={() => act(async () => {
            await updateTicket(ticket.id, { status: "resolved", resolution: resolution.trim(), refund_amount: refund ? Number(refund) : null });
            await addUpdate(ticket.id, `Resolved: ${resolution.trim()}${refund ? ` · Refund approved ₹${Number(refund).toLocaleString("en-IN")}` : ""}`, { role: "jaaga" });
            onClose();
          }, "Ticket resolved")}>Resolve</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
