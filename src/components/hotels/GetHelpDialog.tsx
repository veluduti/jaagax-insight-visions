import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { openTicket, KIND_LABEL, type TicketKind } from "@/services/hospitality/ticketService";

/** Guest-facing "Get help" form; creates a JAAGA Ops ticket tied to the booking. */
export default function GetHelpDialog({ open, onClose, booking }: {
  open: boolean; onClose: () => void; booking: { id: string; hotel_id: string; hotel_name: string | null } | null;
}) {
  const [kind, setKind] = useState<TicketKind>("support");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (body.trim().length < 10) return toast.error("Please describe the issue in a few words");
    setBusy(true);
    try {
      await openTicket({ kind, subject: `${KIND_LABEL[kind]} · ${booking?.hotel_name ?? "Stay"}`, body: body.trim(), booking_id: booking?.id ?? null, hotel_id: booking?.hotel_id ?? null });
      toast.success(kind === "safety" ? "Sent. Our team treats safety reports as urgent." : "Sent. JAAGA support will reply soon.");
      setBody(""); setKind("support"); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>How can JAAGA help?</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(KIND_LABEL) as TicketKind[]).map((k) => (
            <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} className="h-auto whitespace-normal py-2" onClick={() => setKind(k)}>{KIND_LABEL[k]}</Button>
          ))}
        </div>
        {kind === "safety" && <p className="text-xs text-destructive">If you're in immediate danger, call 112 first.</p>}
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us what happened" />
        <Button disabled={busy} onClick={send}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send to JAAGA</Button>
      </DialogContent>
    </Dialog>
  );
}
