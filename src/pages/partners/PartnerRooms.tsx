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
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, IndianRupee, Users, BedDouble, Ban, Save } from "lucide-react";
import { addDays, format } from "date-fns";

type Room = {
  id: string; hotel_id: string; room_type: string; category: string | null;
  description: string | null; base_price: number; max_occupancy: number;
  total_units: number; amenities: any; photos: string[]; is_active: boolean;
};

type RateRow = {
  id?: string; room_id: string; date: string; price: number | null;
  available_units: number | null; stop_sell: boolean;
};

const emptyRoom: Partial<Room> = {
  room_type: "", category: "Deluxe", description: "", base_price: 2500,
  max_occupancy: 2, total_units: 1, amenities: [], photos: [], is_active: true,
};

export default function PartnerRooms() {
  const { loading: gate, hotelId } = usePartnerHotel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Room> | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateRoomId, setRateRoomId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, RateRow>>({});
  const [rateSaving, setRateSaving] = useState(false);

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
    if (!confirm("Delete this room? All rate calendar entries will also be removed.")) return;
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
              <Card key={r.id} className="border border-border/60 bg-background/60 backdrop-blur">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{r.room_type}</p>
                      {r.category && <Badge variant="outline" className="mt-1">{r.category}</Badge>}
                    </div>
                    {!r.is_active && <Badge className="bg-red-500/15 text-red-400">Inactive</Badge>}
                  </div>
                  {r.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
                  <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                    <Stat icon={<IndianRupee className="h-3.5 w-3.5" />} label="Base" value={`₹${Number(r.base_price).toLocaleString()}`} />
                    <Stat icon={<Users className="h-3.5 w-3.5" />} label="Max" value={r.max_occupancy} />
                    <Stat icon={<BedDouble className="h-3.5 w-3.5" />} label="Units" value={r.total_units} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openRates(r)}>
                      Rates & availability
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit room" : "Add room"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Room name *</Label>
                <Input value={editing.room_type || ""} onChange={e => setEditing({ ...editing, room_type: e.target.value })} placeholder="e.g. Deluxe King Room" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Standard / Deluxe / Suite" />
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
            </div>
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
