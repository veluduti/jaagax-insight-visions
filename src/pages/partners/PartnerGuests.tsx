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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Search, Users, Pencil, Trash2, Save, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

type Guest = {
  id: string; hotel_id: string; name: string; email: string | null; phone: string | null;
  tags: string[]; total_bookings: number; total_spent: number;
  last_stay_at: string | null; notes: string | null; created_at: string;
};

const TAG_OPTIONS = ["VIP", "Repeat", "Corporate", "Blacklist"];

export default function PartnerGuests() {
  const { loading: gate, hotelId } = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Guest> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      const { data } = await (supabase as any).from("hotel_guests")
        .select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false });
      // Auto-derive from bookings if empty
      if (!data || data.length === 0) {
        const { data: bks } = await (supabase as any).from("hotel_bookings")
          .select("guest_name,guest_email,guest_phone,total_amount,check_out,status")
          .eq("hotel_id", hotelId);
        const byKey: Record<string, Guest> = {};
        (bks || []).forEach((b: any) => {
          if (b.status === "cancelled") return;
          const key = (b.guest_phone || b.guest_email || b.guest_name || "").toLowerCase();
          if (!key) return;
          if (!byKey[key]) byKey[key] = {
            id: key, hotel_id: hotelId, name: b.guest_name, email: b.guest_email,
            phone: b.guest_phone, tags: [], total_bookings: 0, total_spent: 0,
            last_stay_at: null, notes: null, created_at: new Date().toISOString(),
          };
          byKey[key].total_bookings += 1;
          byKey[key].total_spent += Number(b.total_amount || 0);
          if (!byKey[key].last_stay_at || b.check_out > byKey[key].last_stay_at!)
            byKey[key].last_stay_at = b.check_out;
        });
        setGuests(Object.values(byKey));
      } else setGuests(data);
      setLoading(false);
    })();
  }, [hotelId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter(g => `${g.name} ${g.email || ""} ${g.phone || ""} ${g.tags.join(" ")}`.toLowerCase().includes(term));
  }, [guests, q]);

  const saveGuest = async () => {
    if (!editing || !hotelId) return;
    if (!editing.name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        hotel_id: hotelId,
        name: editing.name,
        email: editing.email || null,
        phone: editing.phone || null,
        tags: editing.tags || [],
        notes: editing.notes || null,
      };
      if (editing.id && !editing.id.includes("@") && editing.id.length === 36) {
        const { error } = await (supabase as any).from("hotel_guests").update(payload).eq("id", editing.id);
        if (error) throw error;
        setGuests(gs => gs.map(g => g.id === editing.id ? { ...g, ...payload } : g));
      } else {
        const { data, error } = await (supabase as any).from("hotel_guests").insert(payload).select().single();
        if (error) throw error;
        setGuests(gs => [data as Guest, ...gs.filter(g => g.id !== editing.id)]);
      }
      toast.success("Guest saved");
      setEditing(null);
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const deleteGuest = async (id: string) => {
    if (id.length !== 36) { setGuests(gs => gs.filter(g => g.id !== id)); return; }
    if (!confirm("Delete this guest?")) return;
    const { error } = await (supabase as any).from("hotel_guests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setGuests(gs => gs.filter(g => g.id !== id));
  };

  const toggleTag = (tag: string) => {
    if (!editing) return;
    const cur = editing.tags || [];
    setEditing({ ...editing, tags: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] });
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
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-emerald-400">Guest CRM</p>
            <h1 className="text-3xl font-bold tracking-tight">Guests</h1>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="w-full pl-8 md:w-72" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Button onClick={() => setEditing({ name: "", tags: [] })} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="mr-1.5 h-4 w-4" /> Add guest
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="border border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold">No guests yet</p>
              <p className="text-sm text-muted-foreground">Guests appear here as they check in.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(g => (
              <Card key={g.id} className="border border-border/60 bg-background/60 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {g.tags.map(t => (
                          <Badge key={t} className={t === "Blacklist" ? "bg-red-500/15 text-red-400" : t === "VIP" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}>
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGuest(g.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {g.phone && <p className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{g.phone}</p>}
                    {g.email && <p className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{g.email}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Stays</p>
                      <p className="font-semibold text-foreground">{g.total_bookings}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-semibold text-foreground">₹{Number(g.total_spent).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last stay</p>
                      <p className="font-semibold text-foreground">{g.last_stay_at ? format(new Date(g.last_stay_at), "dd MMM") : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id && editing.id.length === 36 ? "Edit guest" : "Add guest"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={editing.email || ""} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(t => {
                    const on = (editing.tags || []).includes(t);
                    return (
                      <button type="button" key={t} onClick={() => toggleTag(t)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveGuest} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
