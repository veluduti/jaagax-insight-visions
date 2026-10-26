import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Star, Trash2 } from "lucide-react";

interface Row {
  id: string; name: string; city: string | null; rating: number; quote: string;
  avatar_url: string | null; is_active: boolean; sort_order: number;
}
const empty = { name: "", city: "", rating: 5, quote: "", avatar_url: "", sort_order: 0 };
const sb = supabase as any;

const AdminTestimonials = ({ embedded = false }: { embedded?: boolean }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await sb.from("site_testimonials").select("*").order("sort_order").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.quote.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await sb.from("site_testimonials").insert({
      name: form.name.trim(), city: form.city.trim() || null, rating: form.rating,
      quote: form.quote.trim(), avatar_url: form.avatar_url.trim() || null,
      sort_order: Number(form.sort_order) || 0, created_by: u.user?.id,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not add review", description: "Only global admins can add reviews.", variant: "destructive" });
    setForm(empty); toast({ title: "Review added" }); load();
  };

  const toggle = async (r: Row) => {
    await sb.from("site_testimonials").update({ is_active: !r.is_active }).eq("id", r.id); load();
  };
  const remove = async (r: Row) => {
    if (!confirm(`Delete review from ${r.name}?`)) return;
    await sb.from("site_testimonials").delete().eq("id", r.id); load();
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && <Navigation />}
      <main className={embedded ? "max-w-4xl" : "container mx-auto container-padding py-8 max-w-4xl"}>
        <h1 className="text-2xl font-bold">Homepage Reviews</h1>
        <p className="text-sm text-muted-foreground mb-6">Active reviews appear in "What Our Users Say" on the homepage (first 3 by order).</p>

        <form onSubmit={add} className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-2 mb-8">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="Photo URL (optional)" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
          <div className="flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}>
                  <Star className={`h-6 w-6 ${n <= form.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                </button>
              ))}
            </div>
            <Input type="number" className="w-24" placeholder="Order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <Textarea className="sm:col-span-2" placeholder="Review text *" maxLength={300} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} required />
          <Button type="submit" disabled={saving} className="sm:col-span-2">Add Review</Button>
        </form>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-4 rounded-xl border bg-card p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{r.name} <span className="text-xs text-muted-foreground">{r.city} · {r.rating}★ · order {r.sort_order}</span></p>
                <p className="text-sm text-foreground/80">“{r.quote}”</p>
              </div>
              <label className="flex items-center gap-2 text-xs"><Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />Show</label>
              <Button variant="ghost" size="icon" onClick={() => remove(r)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        </div>
      </main>
    </div>
  );
};

export default AdminTestimonials;
