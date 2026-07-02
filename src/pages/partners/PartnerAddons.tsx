import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "fnb", label: "Food & Beverage" },
  { value: "transport", label: "Transport" },
  { value: "experience", label: "Experience" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
];

export default function PartnerAddons() {
  const { loading, hotelId } = usePartnerHotel();
  const [addons, setAddons] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ title: "", description: "", category: "fnb", price: 0, unit: "per_booking", is_active: true });

  const load = async () => {
    if (!hotelId) return;
    const { data } = await (supabase as any).from("hotel_addons").select("*").eq("hotel_id", hotelId).order("category").order("title");
    setAddons(data || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const save = async () => {
    if (!hotelId || !draft.title) return;
    const payload = { ...draft, hotel_id: hotelId };
    const { error } = draft.id
      ? await (supabase as any).from("hotel_addons").update(payload).eq("id", draft.id)
      : await (supabase as any).from("hotel_addons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setDraft({ title: "", description: "", category: "fnb", price: 0, unit: "per_booking", is_active: true }); load();
  };
  const edit = (a: any) => { setDraft(a); setOpen(true); };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await (supabase as any).from("hotel_addons").delete().eq("id", id); load(); };
  const toggle = async (a: any) => { await (supabase as any).from("hotel_addons").update({ is_active: !a.is_active }).eq("id", a.id); load(); };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin h-4 w-4" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Add-ons & Upsells</h1>
            <p className="text-sm text-muted-foreground">Grow revenue per booking with breakfast, transport, and experiences.</p>
          </div>
          <Button onClick={() => { setDraft({ title: "", description: "", category: "fnb", price: 0, unit: "per_booking", is_active: true }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New add-on
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {addons.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => edit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{a.category}</Badge>
                    <Badge>₹{a.price} / {a.unit}</Badge>
                  </div>
                  <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
                </div>
              </CardContent>
            </Card>
          ))}
          {addons.length === 0 && <p className="text-sm text-muted-foreground">No add-ons yet.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft.id ? "Edit" : "New"} add-on</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Continental breakfast" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={draft.description || ""} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={draft.category} onValueChange={v => setDraft({ ...draft, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (₹)</Label><Input type="number" value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Unit</Label>
              <Select value={draft.unit} onValueChange={v => setDraft({ ...draft, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                  <SelectItem value="per_guest">Per guest</SelectItem>
                  <SelectItem value="per_night">Per night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
