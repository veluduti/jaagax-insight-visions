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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listExtraServices, submitExtraServiceEnquiry } from "@/services/hotelChannelService";
import type { HotelExtraService } from "@/types/hotelCanonical";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Users, MapPin, Clock, Loader2, Check, PlayCircle, CalendarCheck, CheckCircle2,
} from "lucide-react";

const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Corporate Event", "Conference", "Party", "Other"];

const emptyForm = {
  guest_name: "", guest_email: "", guest_phone: "", event_date: "", guests_count: "", message: "",
  event_type: "Wedding", preferred_time_from: "18:00", preferred_time_to: "23:00",
};

/**
 * Guest-facing hotel extra services (banquet hall, pub, conference hall, …).
 * Independent from room inventory — guests view details and send an enquiry.
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
  const [gallery, setGallery] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [prefill, setPrefill] = useState<Partial<typeof emptyForm> | null>(null);
  const [success, setSuccess] = useState<{ service: string; id: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    listExtraServices(hotelId)
      .then((rows) => { if (alive) { setServices(rows); onCount?.(rows.length); } })
      .catch(() => { if (alive) { setServices([]); onCount?.(0); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // Pre-fill contact details for logged-in customers.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await (supabase as any)
        .from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle();
      if (!alive) return;
      setPrefill({
        guest_name: profile?.full_name || (user.user_metadata as any)?.full_name || "",
        guest_email: profile?.email || user.email || "",
        guest_phone: profile?.phone || user.phone || "",
      });
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <section className={variant === "sidebar" ? "space-y-3" : "space-y-4"}>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
      </section>
    );
  }
  const visibleServices = (services || []).filter(Boolean);
  if (!visibleServices.length) return null;

  const openView = (s: HotelExtraService | null) => { if (!s) return; setGallery(0); setViewing(s); };
  const openEnquiry = (s: HotelExtraService | null) => {
    setForm({ ...emptyForm, ...(prefill ?? {}) });
    setSelected(s ?? null);
  };

  const priceLabel = (s: HotelExtraService | null | undefined, prefix = true) =>
    s?.price ? (
      <span className="whitespace-nowrap text-sm font-semibold text-foreground">
        {prefix ? "From " : ""}₹{Number(s.price).toLocaleString("en-IN")}
        <span className="text-xs font-normal text-muted-foreground">
          {" "}/ {String(s.pricing_type || "event").replace(/_/g, " ")}
        </span>
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Price on request</span>
    );

  const capacityLabel = (s: HotelExtraService | null | undefined) => {
    if (!s) return null;
    const max = s.capacity_max ?? s.capacity;
    if (!max) return null;
    return s.capacity_min ? `${s.capacity_min}–${max} guests` : `Up to ${max} guests`;
  };


  const submit = async () => {
    if (!form.guest_name.trim()) { toast.error("Please enter your name"); return; }
    if (!form.guest_phone.trim()) { toast.error("Please enter your phone number"); return; }
    if (!form.event_type) { toast.error("Please select the event / occasion"); return; }
    if (!form.event_date) { toast.error("Please choose an event date"); return; }
    if (!form.guests_count) { toast.error("Please enter the number of guests"); return; }

    setSubmitting(true);
    try {
      const res = await submitExtraServiceEnquiry({
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
      setSuccess({ service: selected?.name ?? "Service", id: res?.id ?? null });
      setSelected(null);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(e.message || "Could not send the enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const sidebar = variant === "sidebar";
  const viewImages = viewing?.images?.length ? viewing.images : [];

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

      <div className={sidebar ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        {services.map((s) => (
          <Card key={s.id} className="overflow-hidden border-border/60 transition-shadow hover:shadow-md">
            <CardContent className="p-3">
              <div className="flex gap-3">
                {s.images?.[0] ? (
                  <img
                    src={s.images[0]}
                    alt={s.name}
                    loading="lazy"
                    className={sidebar ? "h-16 w-16 shrink-0 rounded-lg object-cover" : "h-20 w-24 shrink-0 rounded-lg object-cover"}
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {String(s.service_type || "").replace(/_/g, " ")}
                  </Badge>
                  {capacityLabel(s) && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {capacityLabel(s)}
                    </p>
                  )}
                  <div>{priceLabel(s)}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => openView(s)}>
                  View
                </Button>
                <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => openEnquiry(s)}>
                  Enquire
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service details */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription className="capitalize">
              {String(viewing?.service_type || "").replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>

          {viewImages.length > 0 && (
            <div className="space-y-2">
              <img
                src={viewImages[Math.min(gallery, viewImages.length - 1)]}
                alt={viewing?.name}
                className="h-52 w-full rounded-xl object-cover"
              />
              {viewImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {viewImages.map((img, i) => (
                    <button
                      key={img + i}
                      onClick={() => setGallery(i)}
                      className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                        i === gallery ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 text-sm">
            {viewing?.description && <p className="text-muted-foreground">{viewing.description}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {capacityLabel(viewing as HotelExtraService) && (
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{capacityLabel(viewing as HotelExtraService)}</span>
              )}
              {viewing?.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{viewing.location}</span>
              )}
              {viewing?.duration && (
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{viewing.duration}</span>
              )}
            </div>

            {viewing?.amenities?.length ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Facilities</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {viewing.amenities.slice(0, 6).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1.5 text-xs">
                      <Check className="h-3.5 w-3.5 text-primary" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {viewing?.tags?.length ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Perfect for</p>
                <p className="text-xs text-muted-foreground">{viewing.tags.join(" • ")}</p>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              {viewing ? priceLabel(viewing) : null}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                {viewing?.availability_type
                  ? `${String(viewing.availability_type).replace(/_/g, " ")}`
                  : "Subject to availability"}
              </span>
            </div>

            {viewing?.video_url && (
              <a
                href={viewing.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <PlayCircle className="h-4 w-4" /> Watch Video Tour
              </a>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => { openEnquiry(viewing); setViewing(null); }}>Enquire Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enquiry form */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={form.preferred_time_from} onChange={(e) => setForm({ ...form, preferred_time_from: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">End time</Label>
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

      {/* Success */}
      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Enquiry Sent Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{success?.service}</p>
            {success?.id && (
              <p className="text-xs text-muted-foreground">
                Enquiry ID: <span className="font-mono">{success.id.slice(0, 8).toUpperCase()}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              The hotel will review your request and contact you regarding availability and pricing.
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setSuccess(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
