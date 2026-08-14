import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, X, Save, Building2, ImageIcon, Plus } from "lucide-react";

const AMENITY_SUGGESTIONS = [
  "WiFi", "Parking", "Swimming Pool", "Gym", "Restaurant", "Bar", "Spa",
  "Room Service", "Air Conditioning", "Laundry", "Airport Shuttle", "Pet Friendly",
];

type HotelForm = {
  name: string;
  description: string;
  address: string;
  city: string;
  locality: string;
  state: string;
  district: string;
  country: string;
  star_rating: string;
  contact_phone: string;
  contact_email: string;
  check_in_time: string;
  check_out_time: string;
  total_rooms: string;
  amenities: string[];
  images: string[];
};

const EMPTY: HotelForm = {
  name: "", description: "", address: "", city: "", locality: "", state: "",
  district: "", country: "India", star_rating: "", contact_phone: "", contact_email: "",
  check_in_time: "", check_out_time: "", total_rooms: "", amenities: [], images: [],
};

export default function PartnerHotelProfile() {
  const { loading: ctxLoading, hotelId, userId } = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<HotelForm>(EMPTY);
  const [amenityInput, setAmenityInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof HotelForm>(k: K, v: HotelForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    const { data, error } = await (supabase as any)
      .from("partner_hotels").select("*").eq("id", hotelId).maybeSingle();
    if (error) toast.error("Could not load hotel details");
    if (data) {
      setForm({
        name: data.name || "",
        description: data.description || "",
        address: data.address || "",
        city: data.city || "",
        locality: data.locality || "",
        state: data.state || "",
        district: data.district || "",
        country: data.country || "India",
        star_rating: data.star_rating != null ? String(data.star_rating) : "",
        contact_phone: data.contact_phone || "",
        contact_email: data.contact_email || "",
        check_in_time: data.check_in_time || "",
        check_out_time: data.check_out_time || "",
        total_rooms: data.total_rooms != null ? String(data.total_rooms) : "",
        amenities: Array.isArray(data.amenities) ? data.amenities.filter(Boolean) : [],
        images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
      });
    }
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { if (!ctxLoading) load(); }, [ctxLoading, load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !userId) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/hotel-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await (supabase as any).storage
        .from("hotel-photos").upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Upload failed: ${file.name}`); continue; }
      const { data } = (supabase as any).storage.from("hotel-photos").getPublicUrl(path);
      added.push(data.publicUrl);
    }
    if (added.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...added] }));
      toast.success(`${added.length} photo(s) added — remember to save`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!hotelId) return;
    if (!form.name.trim()) { toast.error("Hotel name is required"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("partner_hotels").update({
      name: form.name.trim(),
      description: form.description || null,
      address: form.address || null,
      city: form.city || null,
      locality: form.locality || null,
      state: form.state || null,
      district: form.district || null,
      country: form.country || null,
      star_rating: form.star_rating ? Number(form.star_rating) : null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      total_rooms: form.total_rooms ? Number(form.total_rooms) : null,
      amenities: form.amenities,
      images: form.images,
      updated_at: new Date().toISOString(),
    }).eq("id", hotelId);
    setSaving(false);
    if (error) { toast.error(error.message || "Save failed"); return; }
    toast.success("Hotel details updated");
  };

  const addAmenity = (val: string) => {
    const v = val.trim();
    if (!v || form.amenities.includes(v)) return;
    set("amenities", [...form.amenities, v]);
    setAmenityInput("");
  };

  const busy = ctxLoading || loading;

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-500" /> Hotel Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Edit your hotel information and photos — changes appear instantly on your public page.
            </p>
          </div>
          <Button onClick={save} disabled={busy || saving || !hotelId}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>

        {busy ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !hotelId ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            No approved hotel is linked to your account yet.
          </CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" /> Photos ({form.images.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                {form.images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No photos yet. Upload images of your property.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {form.images.map((url, i) => (
                      <div key={`${url}-${i}`} className="relative group">
                        <img src={url} alt={`Hotel photo ${i + 1}`} loading="lazy" decoding="async"
                          className="w-full h-28 object-cover rounded-lg border border-border" />
                        <button type="button"
                          onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {i === 0 && <Badge className="absolute bottom-1 left-1">Cover</Badge>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Input placeholder="Or paste an image URL and press Enter"
                    onKeyDown={(e) => {
                      const t = e.currentTarget;
                      if (e.key === "Enter" && t.value.trim()) {
                        e.preventDefault();
                        set("images", [...form.images, t.value.trim()]);
                        t.value = "";
                      }
                    }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Basic information</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Hotel name</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </div>
                <div><Label>Star rating</Label>
                  <Input type="number" min={1} max={5} value={form.star_rating} onChange={(e) => set("star_rating", e.target.value)} /></div>
                <div><Label>Total rooms</Label>
                  <Input type="number" min={0} value={form.total_rooms} onChange={(e) => set("total_rooms", e.target.value)} /></div>
                <div><Label>Check-in time</Label>
                  <Input placeholder="14:00" value={form.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} /></div>
                <div><Label>Check-out time</Label>
                  <Input placeholder="11:00" value={form.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Address</Label>
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
                <div><Label>Locality</Label>
                  <Input value={form.locality} onChange={(e) => set("locality", e.target.value)} /></div>
                <div><Label>City</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
                <div><Label>District</Label>
                  <Input value={form.district} onChange={(e) => set("district", e.target.value)} /></div>
                <div><Label>State</Label>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
                <div><Label>Country</Label>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div><Label>Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></div>
                <div><Label>Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Amenities</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={amenityInput} placeholder="Add an amenity"
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(amenityInput); } }} />
                  <Button variant="outline" onClick={() => addAmenity(amenityInput)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.amenities.map((a) => (
                      <Badge key={a} variant="secondary" className="gap-1">
                        {a}
                        <button onClick={() => set("amenities", form.amenities.filter((x) => x !== a))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {AMENITY_SUGGESTIONS.filter((s) => !form.amenities.includes(s)).map((s) => (
                    <button key={s} onClick={() => addAmenity(s)}
                      className="text-xs rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40">
                      + {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pb-10">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
