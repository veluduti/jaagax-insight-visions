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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Corporate Event", "Conference", "Party", "Other"];

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
  const emptyForm = {
    guest_name: "", guest_email: "", guest_phone: "", event_date: "", guests_count: "", message: "",
    event_type: "Wedding", preferred_time_from: "18:00", preferred_time_to: "23:00",
  };
  const [form, setForm] = useState(emptyForm);
  const [prefill, setPrefill] = useState<{ guest_name: string; guest_email: string; guest_phone: string } | null>(null);

  // Fetch logged-in customer details once so the enquiry form is pre-filled.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await (supabase as any)
        .from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle();
      if (!alive) return;
      setPrefill({
        guest_name: profile?.full_name || user.user_metadata?.full_name || "",
        guest_email: profile?.email || user.email || "",
        guest_phone: profile?.phone || user.phone || "",
      });
    })();
    return () => { alive = false; };
  }, []);

  const openEnquiry = (s: HotelExtraService | null) => {
    setForm({ ...emptyForm, ...(prefill ?? {}) });
    setSelected(s);
  };

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
    if (!form.guest_phone.trim()) { toast.error("Please enter your phone number"); return; }
    if (!form.event_type) { toast.error("Please select the event / occasion"); return; }
    if (!form.event_date) { toast.error("Please choose an event date"); return; }
    if (!form.guests_count) { toast.error("Please enter the number of guests"); return; }
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
        event_type: form.event_type || null,
        preferred_time_from: form.preferred_time_from || null,
        preferred_time_to: form.preferred_time_to || null,
      });
      toast.success("Enquiry sent — the hotel will contact you shortly");
      setSelected(null);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(e.message || "Could not send the enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = (s: HotelExtraService) =>
    s.price ? (
      <span className="whitespace-nowrap text-sm font-semibold">
        ₹{Number(s.price).toLocaleString("en-IN")}
        <span className="text-xs font-normal text-muted-foreground">
          {" "}/ {s.pricing_type.replace(/_/g, " ")}
        </span>
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">On request</span>
    );

  const sidebar = variant === "sidebar";

  return (
    <section className={sidebar ? "space-y-3" : "space-y-4"}>
      <div>
        <h2 className={sidebar ? "text-base font-semibold flex items-center gap-2" : "text-xl font-semibold"}>
          {sidebar && <Building2 className="h-4 w-4 text-primary" />}
          Events & Facilities
        </h2>
        <p className={sidebar ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
          Banquet halls, conference rooms and other venues at this property — enquire directly.
        </p>
      </div>

      {sidebar ? (
        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.id} className="overflow-hidden border-border/60">
              <CardContent className="p-3 space-y-2">
                <div className="flex gap-3">
                  {s.images?.[0] && (
                    <img src={s.images[0]} alt={s.name} loading="lazy" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium truncate">{s.name}</h3>
                    <Badge variant="secondary" className="mt-1 capitalize text-[10px]">
                      {s.service_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {priceLabel(s)}
                  {s.capacity ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />{s.capacity}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setViewing(s)}>
                    View
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => openEnquiry(s)}>
                    Enquire
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
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
                  {priceLabel(s)}
                </div>

                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {s.capacity ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.capacity} guests</span> : null}
                  {s.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span> : null}
                  {s.contact_phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{s.contact_phone}</span> : null}
                </div>

                <Button size="sm" className="w-full" onClick={() => openEnquiry(s)}>
                  <Building2 className="mr-1.5 h-4 w-4" /> Enquire
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription className="capitalize">
              {viewing?.service_type.replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          {viewing?.images?.[0] && (
            <img src={viewing.images[0]} alt={viewing.name} className="h-44 w-full rounded-lg object-cover" />
          )}
          <div className="space-y-2 text-sm">
            {viewing?.description && <p className="text-muted-foreground">{viewing.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {viewing?.capacity ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{viewing.capacity} guests</span> : null}
              {viewing?.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{viewing.location}</span> : null}
              {viewing?.contact_phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{viewing.contact_phone}</span> : null}
            </div>
            {viewing ? <div>{priceLabel(viewing)}</div> : null}
          </div>
          <DialogFooter>
            <Button onClick={() => { openEnquiry(viewing); setViewing(null); }}>Enquire now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                <Label className="text-xs">Phone *</Label>
                <Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Event / Occasion *</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select occasion" /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Event date *</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Guests *</Label>
                <Input type="number" min={1} value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Preferred time</Label>
              <div className="flex items-center gap-2">
                <Input type="time" value={form.preferred_time_from} onChange={(e) => setForm({ ...form, preferred_time_from: e.target.value })} />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="time" value={form.preferred_time_to} onChange={(e) => setForm({ ...form, preferred_time_to: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Message / Requirements</Label>
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
