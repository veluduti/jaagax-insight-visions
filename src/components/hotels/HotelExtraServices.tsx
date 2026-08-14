import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { listExtraServices, submitExtraServiceEnquiry } from "@/services/hotelChannelService";
import type { HotelExtraService } from "@/types/hotelCanonical";
import { toast } from "sonner";
import { Building2, Users, MapPin, Phone, Loader2 } from "lucide-react";

/**
 * JAAGA-only hotel extra services (banquet hall, pub, conference hall, …).
 * Completely independent from room inventory — guests enquire or contact.
 */
export default function HotelExtraServices({
  hotelId,
  variant = "section",
  onCount,
}: {
  hotelId: string;
  variant?: "section" | "sidebar";
  onCount?: (n: number) => void;
}) {
  const [services, setServices] = useState<HotelExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HotelExtraService | null>(null);
  const [viewing, setViewing] = useState<HotelExtraService | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    guest_name: "", guest_email: "", guest_phone: "", event_date: "", guests_count: "", message: "",
  });

  useEffect(() => {
    let alive = true;
    listExtraServices(hotelId)
      .then((rows) => { if (alive) { setServices(rows); onCount?.(rows.length); } })
      .catch(() => { if (alive) { setServices([]); onCount?.(0); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  if (loading || !services.length) return null;


  const submit = async () => {
    if (!form.guest_name.trim()) { toast.error("Please enter your name"); return; }
    if (!form.guest_phone.trim() && !form.guest_email.trim()) {
      toast.error("Please add a phone number or email so the hotel can reach you");
      return;
    }
    setSubmitting(true);
    try {
      await submitExtraServiceEnquiry({
        hotel_id: hotelId,
        service_id: selected?.id ?? null,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        event_date: form.event_date || null,
        guests_count: form.guests_count ? Number(form.guests_count) : null,
        message: form.message.trim() || null,
      });
      toast.success("Enquiry sent — the hotel will contact you shortly");
      setSelected(null);
      setForm({ guest_name: "", guest_email: "", guest_phone: "", event_date: "", guests_count: "", message: "" });
    } catch (e: any) {
      toast.error(e.message || "Could not send the enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Events & Facilities</h2>
        <p className="text-sm text-muted-foreground">
          Banquet halls, conference rooms and other venues at this property — enquire directly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            {s.images?.[0] && (
              <img src={s.images[0]} alt={s.name} loading="lazy" className="h-36 w-full object-cover" />
            )}
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{s.name}</h3>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {s.service_type.replace(/_/g, " ")}
                  </Badge>
                </div>
                {s.price ? (
                  <span className="whitespace-nowrap text-sm font-semibold">
                    ₹{Number(s.price).toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}/ {s.pricing_type.replace(/_/g, " ")}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">On request</span>
                )}
              </div>

              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {s.capacity ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.capacity} guests</span> : null}
                {s.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span> : null}
                {s.contact_phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{s.contact_phone}</span> : null}
              </div>

              <Button size="sm" className="w-full" onClick={() => setSelected(s)}>
                <Building2 className="mr-1.5 h-4 w-4" /> Enquire
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enquire — {selected?.name}</DialogTitle>
            <DialogDescription>The hotel team will get back to you with availability and pricing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Your name *</Label>
              <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Event date</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Guests</Label>
                <Input type="number" min={1} value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Send enquiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
