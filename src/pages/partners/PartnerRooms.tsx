import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, IndianRupee, Users, BedDouble, Ban, Save,
  Image as ImageIcon, Upload, X, Link2, RefreshCw,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { MEAL_TYPES, MEAL_LABEL, type MealType } from "@/lib/hotelPricing";

type Room = {
  id: string; hotel_id: string; room_type: string; category: string | null;
  description: string | null; base_price: number; max_occupancy: number;
  total_units: number; amenities: any; photos: string[]; is_active: boolean;
  bed_type: string | null; size_sqft: number | null; view_type: string | null;
  smoking_allowed: boolean; breakfast_included: boolean;
  extra_bed_allowed: boolean; extra_bed_price: number | null;
  cancellation_policy: string | null; min_nights: number;
  pms_room_code: string | null; pms_room_id: string | null;
  max_adults: number; max_children: number; max_extra_beds: number;
  child_free_age_to: number; child_age_to: number;
};

type MealRow = {
  id?: string; hotel_id?: string; room_id?: string | null; meal_type: MealType;
  pricing_mode: "optional_paid" | "included";
  adult_price: number; child_price: number;
  is_available: boolean; is_active: boolean;
};

type RateRow = {
  id?: string; room_id: string; date: string; price: number | null;
  available_units: number | null; stop_sell: boolean;
};

type ChannelMap = {
  id?: string; hotel_id: string; room_id: string; channel: string;
  external_room_id: string | null; external_rate_plan_id: string | null;
  sync_enabled: boolean; commission_percent: number | null; notes: string | null;
};

const defaultMeals = (): Record<MealType, MealRow> => ({
  breakfast: { meal_type: "breakfast", pricing_mode: "optional_paid", adult_price: 150, child_price: 100, is_available: false, is_active: true },
  lunch: { meal_type: "lunch", pricing_mode: "optional_paid", adult_price: 300, child_price: 200, is_available: false, is_active: true },
  dinner: { meal_type: "dinner", pricing_mode: "optional_paid", adult_price: 350, child_price: 250, is_available: false, is_active: true },
});

const emptyRoom: Partial<Room> = {
  room_type: "", category: "Deluxe", description: "", base_price: 2500,
  max_occupancy: 3, total_units: 1, amenities: [], photos: [], is_active: true,
  bed_type: "King", size_sqft: null, view_type: "", smoking_allowed: false,
  breakfast_included: false, extra_bed_allowed: false, extra_bed_price: null,
  cancellation_policy: "", min_nights: 1, pms_room_code: "", pms_room_id: "",
  max_adults: 2, max_children: 1, max_extra_beds: 0, child_free_age_to: 5, child_age_to: 11,
};

const BED_TYPES = ["King", "Queen", "Double", "Twin", "Single", "Bunk", "Sofa Bed"];
const VIEW_TYPES = ["City", "Garden", "Pool", "Sea", "Mountain", "Courtyard", "No view"];
const AMENITY_PRESETS = [
  "AC", "TV", "Wi-Fi", "Mini bar", "Safe", "Kettle", "Balcony", "Bathtub",
  "Rain shower", "Work desk", "Iron", "Hairdryer", "Room service", "Slippers",
];
const CHANNELS = ["Booking.com", "MakeMyTrip", "Goibibo", "Agoda", "Expedia", "Airbnb", "Direct"];


export default function PartnerRooms() {
  const { loading: gate, hotelId } = usePartnerHotel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Room> | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateRoomId, setRateRoomId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, RateRow>>({});
  const [rateSaving, setRateSaving] = useState(false);
  const [channelRoom, setChannelRoom] = useState<Room | null>(null);
  const [channelMaps, setChannelMaps] = useState<ChannelMap[]>([]);
  const [channelSaving, setChannelSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const days = useMemo(() => Array.from({ length: 30 }).map((_, i) => addDays(new Date(), i)), []);

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      const { data } = await (supabase as any).from("hotel_rooms")
        .select("*").eq("hotel_id", hotelId).order("created_at", { ascending: true });
      setRooms(data || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const openRates = async (room: Room) => {
    setRateRoomId(room.id);
    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[days.length - 1], "yyyy-MM-dd");
    const { data } = await (supabase as any).from("hotel_rate_calendar")
      .select("*").eq("room_id", room.id).gte("date", start).lte("date", end);
    const map: Record<string, RateRow> = {};
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      const existing = (data || []).find((r: any) => r.date === key);
      map[key] = existing || {
        room_id: room.id, date: key,
        price: room.base_price, available_units: room.total_units, stop_sell: false,
      };
    }
    setRates(map);
  };

  const openChannels = async (room: Room) => {
    setChannelRoom(room);
    const { data } = await (supabase as any).from("hotel_room_channel_mappings")
      .select("*").eq("room_id", room.id);
    setChannelMaps(data || []);
  };

  const upsertChannel = (channel: string, patch: Partial<ChannelMap>) => {
    setChannelMaps(prev => {
      const idx = prev.findIndex(m => m.channel === channel);
      if (idx === -1) {
        return [...prev, {
          hotel_id: channelRoom!.hotel_id, room_id: channelRoom!.id, channel,
          external_room_id: null, external_rate_plan_id: null,
          sync_enabled: true, commission_percent: null, notes: null, ...patch,
        }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const saveChannels = async () => {
    if (!channelRoom) return;
    setChannelSaving(true);
    try {
      const rows = channelMaps.filter(m => m.external_room_id || m.notes || m.commission_percent);
      if (rows.length) {
        const { error } = await (supabase as any).from("hotel_room_channel_mappings")
          .upsert(rows, { onConflict: "room_id,channel" });
        if (error) throw error;
      }
      toast.success("Channel mappings saved");
      setChannelRoom(null);
    } catch (e: any) { toast.error(e?.message || "Failed to save mappings"); }
    finally { setChannelSaving(false); }
  };

  const removeChannel = async (channel: string) => {
    if (!channelRoom) return;
    const existing = channelMaps.find(m => m.channel === channel && m.id);
    if (existing?.id) {
      await (supabase as any).from("hotel_room_channel_mappings").delete().eq("id", existing.id);
    }
    setChannelMaps(prev => prev.filter(m => m.channel !== channel));
  };

  const uploadPhoto = async (file: File) => {
    if (!hotelId || !editing) return;
    setUploading(true);
    try {
      const path = `${hotelId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("hotel-room-photos").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("hotel-room-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      setEditing({ ...editing, photos: [...(editing.photos || []), url] });
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const removePhoto = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, photos: (editing.photos || []).filter((_, i) => i !== idx) });
  };

  const toggleAmenity = (name: string) => {
    if (!editing) return;
    const cur: string[] = Array.isArray(editing.amenities) ? editing.amenities : [];
    setEditing({
      ...editing,
      amenities: cur.includes(name) ? cur.filter(a => a !== name) : [...cur, name],
    });
  };

  const saveRoom = async () => {
    if (!editing || !hotelId) return;
    if (!editing.room_type?.trim()) { toast.error("Room name required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        hotel_id: hotelId,
        room_type: editing.room_type,
        category: editing.category,
        description: editing.description,
        base_price: Number(editing.base_price) || 0,
        max_occupancy: Number(editing.max_occupancy) || 1,
        total_units: Number(editing.total_units) || 1,
        amenities: editing.amenities || [],
        photos: editing.photos || [],
        is_active: editing.is_active ?? true,
        bed_type: editing.bed_type || null,
        size_sqft: editing.size_sqft ? Number(editing.size_sqft) : null,
        view_type: editing.view_type || null,
        smoking_allowed: editing.smoking_allowed ?? false,
        breakfast_included: editing.breakfast_included ?? false,
        extra_bed_allowed: editing.extra_bed_allowed ?? false,
        extra_bed_price: editing.extra_bed_price ? Number(editing.extra_bed_price) : null,
        cancellation_policy: editing.cancellation_policy || null,
        min_nights: Number(editing.min_nights) || 1,
        pms_room_code: editing.pms_room_code || null,
        pms_room_id: editing.pms_room_id || null,
      };
      if (editing.id) {
        const { error } = await (supabase as any).from("hotel_rooms").update(payload).eq("id", editing.id);
        if (error) throw error;
        setRooms(rs => rs.map(r => r.id === editing.id ? { ...r, ...payload } : r));
        toast.success("Room updated");
      } else {
        const { data, error } = await (supabase as any).from("hotel_rooms").insert(payload).select().single();
        if (error) throw error;
        setRooms(rs => [...rs, data as Room]);
        toast.success("Room added");
      }
      setEditing(null);
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("Delete this room? All rate calendar entries and channel mappings will also be removed.")) return;
    const { error } = await (supabase as any).from("hotel_rooms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRooms(rs => rs.filter(r => r.id !== id));
    toast.success("Room deleted");
  };

  const saveRates = async () => {
    if (!rateRoomId || !hotelId) return;
    setRateSaving(true);
    try {
      const rows = Object.values(rates).map(r => ({
        hotel_id: hotelId, room_id: r.room_id, date: r.date,
        price: r.price, available_units: r.available_units, stop_sell: r.stop_sell,
      }));
      const { error } = await (supabase as any).from("hotel_rate_calendar")
        .upsert(rows, { onConflict: "room_id,date" });
      if (error) throw error;
      toast.success("Rate calendar saved");
      setRateRoomId(null);
    } catch (e: any) { toast.error(e?.message || "Failed to save rates"); }
    finally { setRateSaving(false); }
  };

  const bulkApply = (field: "price" | "available_units" | "stop_sell", value: any) => {
    setRates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], [field]: value }; });
      return next;
    });
  };

  if (gate || loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav /><PartnerSubNav />
        <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav /><PartnerSubNav />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Rooms & Rates</p>
            <h1 className="text-3xl font-bold tracking-tight">Manage your inventory</h1>
            <p className="mt-1 text-sm text-muted-foreground">Set attributes, upload photos, and map rooms to your PMS and OTA channels.</p>
          </div>
          <Button onClick={() => setEditing(emptyRoom)} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="mr-1.5 h-4 w-4" /> Add room
          </Button>
        </div>

        {rooms.length === 0 ? (
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <BedDouble className="h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold">No rooms yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Add your first room type to start managing inventory, rates, and availability.
              </p>
              <Button onClick={() => setEditing(emptyRoom)} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="mr-1.5 h-4 w-4" /> Add your first room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map(r => (
              <Card key={r.id} className="overflow-hidden border border-border/60 bg-background/60 backdrop-blur">
                {r.photos?.[0] ? (
                  <img src={r.photos[0]} alt={r.room_type} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-muted/20 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{r.room_type}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.category && <Badge variant="outline">{r.category}</Badge>}
                        {r.bed_type && <Badge variant="outline">{r.bed_type}</Badge>}
                        {r.view_type && <Badge variant="outline">{r.view_type}</Badge>}
                      </div>
                    </div>
                    {!r.is_active && <Badge className="bg-red-500/15 text-red-400">Inactive</Badge>}
                  </div>
                  {r.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
                  <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                    <Stat icon={<IndianRupee className="h-3.5 w-3.5" />} label="Base" value={`₹${Number(r.base_price).toLocaleString()}`} />
                    <Stat icon={<Users className="h-3.5 w-3.5" />} label="Max" value={r.max_occupancy} />
                    <Stat icon={<BedDouble className="h-3.5 w-3.5" />} label="Units" value={r.total_units} />
                  </div>
                  {r.pms_room_code && (
                    <p className="mb-2 text-xs text-muted-foreground">PMS code: <span className="text-foreground">{r.pms_room_code}</span></p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openRates(r)}>
                      Rates & availability
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openChannels(r)}>
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => deleteRoom(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Room editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit room" : "Add room"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="basics">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="attributes">Attributes</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="pms">PMS</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-3 pt-4">
                <div>
                  <Label>Room name *</Label>
                  <Input value={editing.room_type || ""} onChange={e => setEditing({ ...editing, room_type: e.target.value })} placeholder="e.g. Deluxe King Room" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Standard / Deluxe / Suite" />
                  </div>
                  <div>
                    <Label>Min nights</Label>
                    <Input type="number" min={1} value={editing.min_nights ?? 1} onChange={e => setEditing({ ...editing, min_nights: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Base price ₹</Label>
                    <Input type="number" value={editing.base_price ?? 0} onChange={e => setEditing({ ...editing, base_price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max guests</Label>
                    <Input type="number" value={editing.max_occupancy ?? 2} onChange={e => setEditing({ ...editing, max_occupancy: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Total units</Label>
                    <Input type="number" value={editing.total_units ?? 1} onChange={e => setEditing({ ...editing, total_units: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-semibold">Active</p>
                    <p className="text-xs text-muted-foreground">Bookable and shown to guests</p>
                  </div>
                  <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                </div>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-3 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Bed type</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={editing.bed_type || ""}
                      onChange={e => setEditing({ ...editing, bed_type: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {BED_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Room size (sqft)</Label>
                    <Input type="number" value={editing.size_sqft ?? ""} onChange={e => setEditing({ ...editing, size_sqft: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>View</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={editing.view_type || ""}
                      onChange={e => setEditing({ ...editing, view_type: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {VIEW_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Amenities</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AMENITY_PRESETS.map(a => {
                      const active = Array.isArray(editing.amenities) && editing.amenities.includes(a);
                      return (
                        <button
                          type="button"
                          key={a}
                          onClick={() => toggleAmenity(a)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            active ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-border/60 text-muted-foreground hover:border-emerald-500/60"
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ToggleRow label="Smoking allowed" checked={!!editing.smoking_allowed} onChange={v => setEditing({ ...editing, smoking_allowed: v })} />
                  <ToggleRow label="Breakfast included" checked={!!editing.breakfast_included} onChange={v => setEditing({ ...editing, breakfast_included: v })} />
                  <ToggleRow label="Extra bed allowed" checked={!!editing.extra_bed_allowed} onChange={v => setEditing({ ...editing, extra_bed_allowed: v })} />
                  <div>
                    <Label>Extra bed price ₹</Label>
                    <Input type="number" disabled={!editing.extra_bed_allowed} value={editing.extra_bed_price ?? ""} onChange={e => setEditing({ ...editing, extra_bed_price: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <Label>Cancellation policy</Label>
                  <Textarea rows={2} value={editing.cancellation_policy || ""} onChange={e => setEditing({ ...editing, cancellation_policy: e.target.value })} placeholder="e.g. Free cancellation until 24 hours before check-in" />
                </div>
              </TabsContent>

              <TabsContent value="photos" className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:border-emerald-500/60">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload photo
                    <input
                      type="file" accept="image/*" hidden
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.currentTarget.value = ""; }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">First photo becomes the cover image.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(editing.photos || []).map((p, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-md border border-border/60">
                      <img src={p} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                      {i === 0 && <Badge className="absolute left-1 top-1 bg-emerald-500 text-white">Cover</Badge>}
                    </div>
                  ))}
                  {(editing.photos || []).length === 0 && (
                    <div className="col-span-3 rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No photos uploaded yet.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pms" className="space-y-3 pt-4">
                <p className="text-xs text-muted-foreground">Link this room to the matching room in your Property Management System. Codes are used to sync rates and availability.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>PMS room code</Label>
                    <Input value={editing.pms_room_code || ""} onChange={e => setEditing({ ...editing, pms_room_code: e.target.value })} placeholder="e.g. DLX-KING" />
                  </div>
                  <div>
                    <Label>PMS room ID</Label>
                    <Input value={editing.pms_room_id || ""} onChange={e => setEditing({ ...editing, pms_room_id: e.target.value })} placeholder="Internal PMS identifier" />
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  Channel mappings (Booking.com, MakeMyTrip, etc.) are managed per-room from the room card — click the <Link2 className="inline h-3 w-3" /> icon.
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveRoom} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel mappings dialog */}
      <Dialog open={!!channelRoom} onOpenChange={(o) => !o && setChannelRoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Channel mappings · {channelRoom?.room_type}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Enter the external room/rate-plan ID for each OTA to sync inventory and rates.</p>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {CHANNELS.map(ch => {
              const m = channelMaps.find(x => x.channel === ch) || {
                hotel_id: channelRoom?.hotel_id || "", room_id: channelRoom?.id || "", channel: ch,
                external_room_id: null, external_rate_plan_id: null,
                sync_enabled: true, commission_percent: null, notes: null,
              } as ChannelMap;
              return (
                <div key={ch} className="rounded-md border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                      <p className="text-sm font-semibold">{ch}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        Sync
                        <Switch checked={m.sync_enabled} onCheckedChange={v => upsertChannel(ch, { sync_enabled: v })} />
                      </div>
                      {m.id && (
                        <Button size="sm" variant="ghost" onClick={() => removeChannel(ch)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="External room ID" value={m.external_room_id || ""} onChange={e => upsertChannel(ch, { external_room_id: e.target.value || null })} />
                    <Input placeholder="Rate plan ID (optional)" value={m.external_rate_plan_id || ""} onChange={e => upsertChannel(ch, { external_rate_plan_id: e.target.value || null })} />
                    <Input type="number" placeholder="Commission %" value={m.commission_percent ?? ""} onChange={e => upsertChannel(ch, { commission_percent: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelRoom(null)}>Cancel</Button>
            <Button onClick={saveChannels} disabled={channelSaving} className="bg-emerald-500 hover:bg-emerald-600">
              {channelSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate calendar */}
      <Dialog open={!!rateRoomId} onOpenChange={(o) => !o && setRateRoomId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Rates & availability · next 30 days</DialogTitle>
          </DialogHeader>

          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-md border border-border/60 bg-muted/20 p-3">
            <div className="text-xs font-semibold text-muted-foreground">Bulk apply:</div>
            <BulkInput label="Price" onApply={v => bulkApply("price", v)} />
            <BulkInput label="Units" onApply={v => bulkApply("available_units", v)} />
            <Button size="sm" variant="outline" onClick={() => bulkApply("stop_sell", true)}><Ban className="mr-1 h-3 w-3" />Block all</Button>
            <Button size="sm" variant="outline" onClick={() => bulkApply("stop_sell", false)}>Open all</Button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border/60">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="p-2">Date</th>
                  <th className="p-2">Price ₹</th>
                  <th className="p-2">Available</th>
                  <th className="p-2">Stop-sell</th>
                </tr>
              </thead>
              <tbody>
                {days.map(d => {
                  const k = format(d, "yyyy-MM-dd");
                  const r = rates[k];
                  if (!r) return null;
                  return (
                    <tr key={k} className="border-b border-border/40">
                      <td className="p-2">
                        <div className="font-medium">{format(d, "EEE, dd MMM")}</div>
                      </td>
                      <td className="p-2">
                        <Input type="number" className="h-8 w-24" value={r.price ?? ""} onChange={e => setRates(p => ({ ...p, [k]: { ...r, price: e.target.value === "" ? null : Number(e.target.value) } }))} />
                      </td>
                      <td className="p-2">
                        <Input type="number" className="h-8 w-20" value={r.available_units ?? ""} onChange={e => setRates(p => ({ ...p, [k]: { ...r, available_units: e.target.value === "" ? null : Number(e.target.value) } }))} />
                      </td>
                      <td className="p-2">
                        <Switch checked={r.stop_sell} onCheckedChange={v => setRates(p => ({ ...p, [k]: { ...r, stop_sell: v } }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRateRoomId(null)}>Cancel</Button>
            <Button onClick={saveRates} disabled={rateSaving} className="bg-emerald-500 hover:bg-emerald-600">
              {rateSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">{icon}{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function BulkInput({ label, onApply }: { label: string; onApply: (v: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs">{label}</Label>
      <Input className="h-8 w-24" type="number" value={v} onChange={e => setV(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => v !== "" && onApply(Number(v))}>Apply</Button>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
      <p className="text-sm">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
