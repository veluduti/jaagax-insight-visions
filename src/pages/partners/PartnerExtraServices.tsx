import { useEffect, useState, useCallback, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  PartyPopper,
  Users,
  Mail,
  Upload,
  X,
  Calendar,
  Clock,
  Tag,
  Video,
  Settings,
} from "lucide-react";

const SERVICE_TYPES = [
  "banquet_hall",
  "conference_hall",
  "pub",
  "restaurant",
  "spa",
  "pool",
  "gym",
  "parking",
  "event_lawn",
  "other",
];

const SERVICE_CATEGORIES = [
  "venue",
  "catering",
  "entertainment",
  "transport",
  "accommodation",
  "recreation",
  "wellness",
  "business",
  "wedding",
  "corporate",
];

const PRICING_TYPES = ["per_event", "per_hour", "per_day", "per_person", "on_request"];

const AVAILABILITY_TYPES = ["on_request", "always", "seasonal", "by_appointment"];

const AMENITIES = [
  "WiFi",
  "Parking",
  "Air Conditioning",
  "Projector",
  "Sound System",
  "Stage",
  "Dance Floor",
  "Bar",
  "Catering",
  "Decoration",
  "Outdoor Area",
  "Indoor Area",
  "Wheelchair Access",
  "Pet Friendly",
  "Smoking Area",
  "Live Music",
  "DJ Setup",
  "Lighting System",
  "Valet Parking",
  "Security",
  "CCTV",
  "Fire Safety",
  "First Aid",
];

const CANCELLATION_POLICIES = [
  { value: "flexible", label: "Flexible - Full refund up to 7 days before" },
  { value: "moderate", label: "Moderate - Full refund up to 14 days before" },
  { value: "strict", label: "Strict - Partial refund up to 30 days before" },
  { value: "non_refundable", label: "Non-refundable" },
];

export default function PartnerExtraServices() {
  const { loading: ctxLoading, hotelId } = usePartnerHotel();
  const [services, setServices] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blank = {
    service_type: "banquet_hall",
    category: "venue",
    name: "",
    description: "",
    capacity_min: "",
    capacity_max: "",
    location: "",
    price: "",
    pricing_type: "per_event",
    availability_type: "on_request",
    contact_phone: "",
    contact_email: "",
    images: [],
    amenities: [],
    tags: [],
    is_active: true,
    video_url: "",
    duration: "",
    advance_booking_days: "0",
    cancellation_policy: "flexible",
    special_instructions: "",
    setup_time: "",
    cleanup_time: "",
    min_booking_duration: "",
    max_booking_duration: "",
  };

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const sb: any = supabase;
    const [{ data: s }, { data: e }] = await Promise.all([
      sb.from("hotel_extra_services").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
      sb
        .from("hotel_extra_service_enquiries")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setServices(s || []);
    setEnquiries(e || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !hotelId) return;
    setUploadingImages(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${hotelId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await (supabase as any).storage.from("hotel_extra_services").upload(fileName, file);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = (supabase as any).storage.from("hotel_extra_services").getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setEditing({
        ...editing,
        images: [...(editing.images || []), ...uploadedUrls],
      });

      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setEditing({
      ...editing,
      images: editing.images?.filter((_: string, index: number) => index !== indexToRemove) || [],
    });
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Service name is required");
      return;
    }

    // Validate capacity
    const minCap = parseInt(editing.capacity_min);
    const maxCap = parseInt(editing.capacity_max);
    if (editing.capacity_min && editing.capacity_max && minCap > maxCap) {
      toast.error("Minimum capacity cannot be greater than maximum capacity");
      return;
    }

    setSaving(true);
    const payload = {
      hotel_id: hotelId,
      service_type: editing.service_type,
      category: editing.category,
      name: editing.name.trim(),
      description: editing.description || null,
      capacity_min: editing.capacity_min ? Number(editing.capacity_min) : null,
      capacity_max: editing.capacity_max ? Number(editing.capacity_max) : null,
      location: editing.location || null,
      price: editing.price ? Number(editing.price) : null,
      currency: "INR",
      pricing_type: editing.pricing_type,
      availability_type: editing.availability_type,
      contact_phone: editing.contact_phone || null,
      contact_email: editing.contact_email || null,
      images: Array.isArray(editing.images) ? editing.images : [],
      amenities: Array.isArray(editing.amenities) ? editing.amenities : [],
      tags: Array.isArray(editing.tags)
        ? editing.tags
        : editing.tags
            ?.split(",")
            .map((t: string) => t.trim())
            .filter(Boolean) || [],
      is_active: editing.is_active,
      video_url: editing.video_url || null,
      duration: editing.duration || null,
      advance_booking_days: editing.advance_booking_days ? Number(editing.advance_booking_days) : 0,
      cancellation_policy: editing.cancellation_policy || "flexible",
      special_instructions: editing.special_instructions || null,
      setup_time: editing.setup_time || null,
      cleanup_time: editing.cleanup_time || null,
      min_booking_duration: editing.min_booking_duration || null,
      max_booking_duration: editing.max_booking_duration || null,
    };

    try {
      const sb: any = supabase;
      const { error } = editing.id
        ? await sb.from("hotel_extra_services").update(payload).eq("id", editing.id)
        : await sb.from("hotel_extra_services").insert(payload);
      if (error) throw error;
      toast.success("Service saved successfully");
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
    toast.success("Service deleted successfully");
    load();
  };

  const setEnquiryStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("hotel_extra_service_enquiries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Enquiry marked as ${status}`);
    load();
  };

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = editing.amenities || [];
    const updated = currentAmenities.includes(amenity)
      ? currentAmenities.filter((a: string) => a !== amenity)
      : [...currentAmenities, amenity];
    setEditing({ ...editing, amenities: updated });
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
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No extra services yet. Click "Add service" to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span className="flex items-center gap-2">
                          <PartyPopper className="h-4 w-4 text-primary" />
                          {s.name}
                          {s.category && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {s.category}
                            </Badge>
                          )}
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
                        <Badge variant="secondary" className="capitalize">
                          {s.service_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {s.pricing_type.replace(/_/g, " ")}
                        </Badge>
                        {!s.is_active && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      {s.description && <p className="text-muted-foreground line-clamp-2">{s.description}</p>}
                      <div className="text-muted-foreground space-y-1">
                        {s.capacity_min && s.capacity_max && (
                          <p className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Capacity: {s.capacity_min} - {s.capacity_max} guests
                          </p>
                        )}
                        {s.capacity_min && !s.capacity_max && (
                          <p className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Capacity: Min {s.capacity_min} guests
                          </p>
                        )}
                        {s.price && (
                          <p>
                            ₹{Number(s.price).toLocaleString("en-IN")} ({s.pricing_type.replace(/_/g, " ")})
                          </p>
                        )}
                        {s.duration && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {s.duration}
                          </p>
                        )}
                        {s.amenities && s.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.amenities.slice(0, 3).map((a: string) => (
                              <Badge key={a} variant="outline" className="text-xs">
                                {a}
                              </Badge>
                            ))}
                            {s.amenities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{s.amenities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enquiries" className="pt-4">
            {!enquiries.length ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">No enquiries yet.</CardContent>
              </Card>
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
                        </p>
                        <p className="text-muted-foreground">
                          {[
                            e.event_type,
                            e.event_date,
                            e.guests_count ? `${e.guests_count} guests` : null,
                            e.preferred_time_from ? `${e.preferred_time_from}${e.preferred_time_to ? ` - ${e.preferred_time_to}` : ""}` : null,
                          ].filter(Boolean).join(" · ")}
                        </p>
                        {e.message && <p className="mt-1 text-muted-foreground">{e.message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={e.status === "new" ? "default" : "secondary"}>{e.status}</Badge>
                        <Select value={e.status} onValueChange={(v) => setEnquiryStatus(e.id, v)}>
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["new", "contacted", "quoted", "won", "lost"].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
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
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Service" : "Add New Service"}</DialogTitle>
            <DialogDescription>
              Complete all fields to add or update your service. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Service Name *</Label>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="e.g., Grand Ballroom"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Service Type</Label>
                    <Select
                      value={editing.service_type}
                      onValueChange={(v) => setEditing({ ...editing, service_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Category</Label>
                    <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Location in Property</Label>
                    <Input
                      value={editing.location ?? ""}
                      onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                      placeholder="e.g., Ground floor, west wing"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    rows={3}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Describe your service in detail..."
                  />
                </div>
              </div>

              {/* Capacity & Pricing */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Capacity & Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Min Capacity</Label>
                    <Input
                      type="number"
                      value={editing.capacity_min ?? ""}
                      onChange={(e) => setEditing({ ...editing, capacity_min: e.target.value })}
                      placeholder="Minimum guests"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Max Capacity</Label>
                    <Input
                      type="number"
                      value={editing.capacity_max ?? ""}
                      onChange={(e) => setEditing({ ...editing, capacity_max: e.target.value })}
                      placeholder="Maximum guests"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Price (₹)</Label>
                    <Input
                      type="number"
                      value={editing.price ?? ""}
                      onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                      placeholder="Price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Pricing Type</Label>
                    <Select
                      value={editing.pricing_type}
                      onValueChange={(v) => setEditing({ ...editing, pricing_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICING_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Availability</Label>
                    <Select
                      value={editing.availability_type}
                      onValueChange={(v) => setEditing({ ...editing, availability_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABILITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Duration</Label>
                    <Input
                      value={editing.duration || ""}
                      onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                      placeholder="e.g., 4 hours, Full day"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Booking Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Advance Booking Required (Days)</Label>
                    <Input
                      type="number"
                      value={editing.advance_booking_days ?? "0"}
                      onChange={(e) => setEditing({ ...editing, advance_booking_days: e.target.value })}
                      placeholder="Days required in advance"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Cancellation Policy</Label>
                    <Select
                      value={editing.cancellation_policy}
                      onValueChange={(v) => setEditing({ ...editing, cancellation_policy: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCELLATION_POLICIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Min Booking Duration</Label>
                    <Input
                      value={editing.min_booking_duration || ""}
                      onChange={(e) => setEditing({ ...editing, min_booking_duration: e.target.value })}
                      placeholder="e.g., 2 hours"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Max Booking Duration</Label>
                    <Input
                      value={editing.max_booking_duration || ""}
                      onChange={(e) => setEditing({ ...editing, max_booking_duration: e.target.value })}
                      placeholder="e.g., 8 hours"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Contact Phone</Label>
                    <Input
                      value={editing.contact_phone ?? ""}
                      onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Contact Email</Label>
                    <Input
                      value={editing.contact_email ?? ""}
                      onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </div>

              {/* Setup & Cleanup */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Setup & Cleanup
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Setup Time</Label>
                    <Input
                      value={editing.setup_time || ""}
                      onChange={(e) => setEditing({ ...editing, setup_time: e.target.value })}
                      placeholder="e.g., 2 hours before event"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Cleanup Time</Label>
                    <Input
                      value={editing.cleanup_time || ""}
                      onChange={(e) => setEditing({ ...editing, cleanup_time: e.target.value })}
                      placeholder="e.g., 1 hour after event"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Amenities & Features
                </h3>
                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AMENITIES.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity}`}
                          checked={(editing.amenities || []).includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        <label htmlFor={`amenity-${amenity}`} className="text-sm cursor-pointer">
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags & Special Instructions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Additional Information
                </h3>
                <div>
                  <Label className="text-xs font-semibold">Tags (comma-separated)</Label>
                  <Input
                    value={editing.tags?.join(", ") || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g., wedding, corporate, family, birthday"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Special Instructions</Label>
                  <Textarea
                    rows={2}
                    value={editing.special_instructions ?? ""}
                    onChange={(e) => setEditing({ ...editing, special_instructions: e.target.value })}
                    placeholder="Any special instructions for guests (dress code, outside food policy, etc.)"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Video Tour URL</Label>
                  <Input
                    value={editing.video_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                    placeholder="YouTube or Vimeo URL"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Images
                </h3>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                      {uploadingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Images
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Upload multiple images (JPG, PNG, WebP). Max 5MB each.
                    </p>
                  </div>

                  {editing.images && editing.images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                      {editing.images.map((url: string, index: number) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Service image ${index + 1}`}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Visible to guests
                </span>
                <Switch
                  checked={!!editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Save Service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
