import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Rule = any;
type Promo = any;

const RULE_TYPES = [
  { value: "day_of_week", label: "Day of week (e.g. weekend uplift)" },
  { value: "occupancy", label: "Occupancy-based" },
  { value: "lead_time", label: "Lead time (early / last-minute)" },
  { value: "min_stay", label: "Minimum-stay discount" },
  { value: "date_range", label: "Date range (peak season)" },
];

export default function PartnerPricing() {
  const { loading, hotelId } = usePartnerHotel();
  const [tab, setTab] = useState("rules");
  const [rules, setRules] = useState<Rule[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [openRule, setOpenRule] = useState(false);
  const [openPromo, setOpenPromo] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<any>({ name: "", rule_type: "day_of_week", adjustment_type: "percent", adjustment_value: 10, is_active: true, conditions: {} });
  const [promoDraft, setPromoDraft] = useState<any>({ code: "", description: "", discount_type: "percent", discount_value: 10, is_active: true, min_nights: 1 });

  const load = async () => {
    if (!hotelId) return;
    const [r, p] = await Promise.all([
      (supabase as any).from("hotel_pricing_rules").select("*").eq("hotel_id", hotelId).order("priority", { ascending: false }),
      (supabase as any).from("hotel_promo_codes").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
    ]);
    setRules(r.data || []); setPromos(p.data || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const saveRule = async () => {
    if (!hotelId || !ruleDraft.name) return;
    const { error } = await (supabase as any).from("hotel_pricing_rules").insert({ ...ruleDraft, hotel_id: hotelId });
    if (error) return toast.error(error.message);
    toast.success("Rule saved"); setOpenRule(false); load();
  };
  const savePromo = async () => {
    if (!hotelId || !promoDraft.code) return;
    const { error } = await (supabase as any).from("hotel_promo_codes").insert({ ...promoDraft, hotel_id: hotelId, code: promoDraft.code.toUpperCase() });
    if (error) return toast.error(error.message);
    toast.success("Promo code saved"); setOpenPromo(false); load();
  };

  const toggleRule = async (r: Rule) => {
    await (supabase as any).from("hotel_pricing_rules").update({ is_active: !r.is_active }).eq("id", r.id); load();
  };
  const togglePromo = async (p: Promo) => {
    await (supabase as any).from("hotel_promo_codes").update({ is_active: !p.is_active }).eq("id", p.id); load();
  };
  const delRule = async (id: string) => { await (supabase as any).from("hotel_pricing_rules").delete().eq("id", id); load(); };
  const delPromo = async (id: string) => { await (supabase as any).from("hotel_promo_codes").delete().eq("id", id); load(); };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin h-4 w-4" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dynamic Pricing & Promotions</h1>
          <p className="text-sm text-muted-foreground">Automate rate adjustments and run promo codes to fill more rooms.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="rules">Pricing rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="promos">Promo codes ({promos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenRule(true)}><Plus className="h-4 w-4 mr-2" /> New rule</Button>
            </div>
            {rules.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="secondary">{r.rule_type}</Badge>
                      <Badge>{r.adjustment_type === "percent" ? `${r.adjustment_value}%` : `₹${r.adjustment_value}`}</Badge>
                      {r.is_active ? <Badge className="bg-emerald-500/15 text-emerald-400">Active</Badge> : <Badge variant="outline">Off</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r)} />
                    <Button size="sm" variant="ghost" onClick={() => delRule(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet. Add your first rule to start pricing dynamically.</p>}
          </TabsContent>

          <TabsContent value="promos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenPromo(true)}><Plus className="h-4 w-4 mr-2" /> New promo</Button>
            </div>
            {promos.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium tracking-wider">{p.code}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge>{p.discount_type === "percent" ? `${p.discount_value}% off` : `₹${p.discount_value} off`}</Badge>
                      <Badge variant="secondary">Used {p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</Badge>
                      {p.valid_until && <Badge variant="outline">until {p.valid_until}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={p.is_active} onCheckedChange={() => togglePromo(p)} />
                    <Button size="sm" variant="ghost" onClick={() => delPromo(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {promos.length === 0 && <p className="text-sm text-muted-foreground">No promo codes yet.</p>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openRule} onOpenChange={setOpenRule}>
        <DialogContent>
          <DialogHeader><DialogTitle>New pricing rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={ruleDraft.name} onChange={e => setRuleDraft({ ...ruleDraft, name: e.target.value })} placeholder="Weekend uplift" /></div>
            <div><Label>Type</Label>
              <Select value={ruleDraft.rule_type} onValueChange={v => setRuleDraft({ ...ruleDraft, rule_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Adjustment</Label>
                <Select value={ruleDraft.adjustment_type} onValueChange={v => setRuleDraft({ ...ruleDraft, adjustment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="flat">Flat ₹</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={ruleDraft.adjustment_value} onChange={e => setRuleDraft({ ...ruleDraft, adjustment_value: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Conditions (JSON — advanced)</Label>
              <Textarea rows={3} value={JSON.stringify(ruleDraft.conditions)} onChange={e => { try { setRuleDraft({ ...ruleDraft, conditions: JSON.parse(e.target.value || "{}") }); } catch {} }} />
              <p className="text-xs text-muted-foreground mt-1">e.g. {"{"}"days":[5,6]{"}"} for Fri–Sat</p>
            </div>
          </div>
          <DialogFooter><Button onClick={saveRule}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openPromo} onOpenChange={setOpenPromo}>
        <DialogContent>
          <DialogHeader><DialogTitle>New promo code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code</Label><Input value={promoDraft.code} onChange={e => setPromoDraft({ ...promoDraft, code: e.target.value.toUpperCase() })} placeholder="MONSOON10" /></div>
            <div><Label>Description</Label><Input value={promoDraft.description} onChange={e => setPromoDraft({ ...promoDraft, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount</Label>
                <Select value={promoDraft.discount_type} onValueChange={v => setPromoDraft({ ...promoDraft, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="flat">Flat ₹</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={promoDraft.discount_value} onChange={e => setPromoDraft({ ...promoDraft, discount_value: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valid from</Label><Input type="date" value={promoDraft.valid_from || ""} onChange={e => setPromoDraft({ ...promoDraft, valid_from: e.target.value })} /></div>
              <div><Label>Valid until</Label><Input type="date" value={promoDraft.valid_until || ""} onChange={e => setPromoDraft({ ...promoDraft, valid_until: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max uses</Label><Input type="number" value={promoDraft.max_uses || ""} onChange={e => setPromoDraft({ ...promoDraft, max_uses: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Min nights</Label><Input type="number" value={promoDraft.min_nights} onChange={e => setPromoDraft({ ...promoDraft, min_nights: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={savePromo}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
