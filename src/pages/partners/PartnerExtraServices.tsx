import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, PartyPopper, Users, Mail } from "lucide-react";

const SERVICE_TYPES = [
  "banquet_hall", "conference_hall", "pub", "restaurant", "spa",
  "pool", "gym", "parking", "event_lawn", "other",
];

const PRICING_TYPES = ["per_event", "per_hour", "per_day", "per_person", "on_request"];

export default function PartnerExtraServices() {
  const { loading: ctxLoading, hotelId } = usePartnerHotel();
  const [services, setServices] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const blank = {
    service_type: "banquet_hall", name: "", description: "", capacity: "",
    location: "", price: "", pricing_type: "per_event", availability_type: "on_request",
    contact_phone: "", contact_email: "", images: [], is_active: true,
  };

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const sb: any = supabase;
    const [{ data: s }, { data: e }] = await Promise.all([
      sb.from("hotel_extra_services").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
      sb.from("hotel_extra_service_enquiries").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(50),
    ]);
    setServices(s || []); setEnquiries(e || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Service name is required"); return; }
    setSaving(true);
    const payload = {
      hotel_id: hotelId,
      service_type: editing.service_type,
      name: editing.name.trim(),
      description: editing.description || null,
      capacity: editing.capacity ? Number(editing.capacity) : null,
      location: editing.location || null,
      price: editing.price ? Number(editing.price) : null,
      currency: "INR",
      pricing_type: editing.pricing_type,
      availability_type: editing.availability_type,
      contact_phone: editing.contact_phone || null,
      contact_email: editing.contact_email || null,
      images: Array.isArray(editing.images) ? editing.images : [],
      is_active: editing.is_active,
    };
    try {
      const sb: any = supabase;
      const { error } = editing.id
        ? await sb.from("hotel_extra_services").update(payload).eq("id", editing.id)
        : await sb.from("hotel_extra_services").insert(payload);
      if (error) throw error;
      toast.success("Service saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not save the service");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("hotel_extra_services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Service deleted");
    load();
  };

  const setEnquiryStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("hotel_extra_service_enquiries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Extra Services</h1>
            <p className="text-sm text-muted-foreground">
              Banquet halls, conference rooms, pubs and other venues. These are JAAGA-only and are never sent to
              connected channels.
            </p>
          </div>
          <Button onClick={() => setEditing({ ...blank })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add service
          </Button>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="enquiries">Enquiries ({enquiries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="pt-4">
            {!services.length ? (
              <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
                No extra services yet.
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span className="flex items-center gap-2">
                          <PartyPopper className="h-4 w-4 text-primary" />{s.name}
                        </span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing({ ...s })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="capitalize">{s.service_type.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className="capitalize">{s.pricing_type.replace(/_/g, " ")}</Badge>
                        {!s.is_active && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      {s.description && <p className="text-muted-foreground">{s.description}</p>}
                      <p className="text-muted-foreground">
                        {s.capacity ? `Up to ${s.capacity} guests · ` : ""}
                        {s.price ? `₹${Number(s.price).toLocaleString("en-IN")}` : "Price on request"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enquiries" className="pt-4">
            {!enquiries.length ? (
              <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
                No enquiries yet.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {enquiries.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <div>
                        <p className="font-medium">
                          {e.guest_name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleString()}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          {[e.guest_phone, e.guest_email].filter(Boolean).join(" · ")}
                          {e.event_date ? ` · ${e.event_date}` : ""}
                          {e.guests_count ? ` · ${e.guests_count} guests` : ""}
                        </p>
                        {e.message && <p className="mt-1 text-muted-foreground">{e.message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={e.status === "new" ? "default" : "secondary"}>{e.status}</Badge>
                        <Select value={e.status} onValueChange={(v) => setEnquiryStatus(e.id, v)}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["new", "contacted", "quoted", "won", "lost"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit service" : "New service"}</DialogTitle>
            <DialogDescription>Shown to guests on your hotel page as an enquiry-only facility.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={editing.service_type} onValueChange={(v) => setEditing({ ...editing, service_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Capacity</Label>
                  <Input type="number" value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Price (₹)</Label>
                  <Input type="number" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Pricing</Label>
                  <Select value={editing.pricing_type} onValueChange={(v) => setEditing({ ...editing, pricing_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICING_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Location in property</Label>
                  <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Ground floor, west wing" />
                </div>
                <div>
                  <Label className="text-xs">Availability</Label>
                  <Select value={editing.availability_type} onValueChange={(v) => setEditing({ ...editing, availability_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_request">On request</SelectItem>
                      <SelectItem value="always">Always available</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact phone</Label>
                  <Input value={editing.contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Contact email</Label>
                  <Input value={editing.contact_email ?? ""} onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Image URLs (one per line)</Label>
                <Textarea rows={2}
                  value={(editing.images ?? []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, images: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })} />
              </div>
              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />Visible to guests</span>
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Mail className="mr-2 h-4 w-4" />Save service</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
