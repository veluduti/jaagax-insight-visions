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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Tag, ShieldCheck, Link2 } from "lucide-react";

const BOARDS = [
  { value: "RO", label: "Room Only" },
  { value: "BB", label: "Breakfast Included" },
  { value: "HB", label: "Half Board" },
  { value: "FB", label: "Full Board" },
  { value: "AI", label: "All Inclusive" },
];

const PENALTY_TYPES = [
  { value: "percent", label: "% of stay" },
  { value: "nights", label: "Nights" },
  { value: "currency", label: "Fixed amount" },
];

type Plan = any;

export default function PartnerRatePlans() {
  const { loading: ctxLoading, hotelId } = usePartnerHotel();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const blank = {
    room_id: "", rate_plan_code: "", rate_plan_name: "", board: "RO",
    description: "", adjustment_type: "percent", adjustment_value: 0,
    is_refundable: true, is_promotion: false, is_package_rate: false,
    is_private: false, is_immediate: true, is_active: true,
  };

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const sb: any = supabase;
    const [{ data: p }, { data: r }, { data: c }] = await Promise.all([
      sb.from("hotel_rate_plans").select("*").eq("hotel_id", hotelId).order("created_at"),
      sb.from("hotel_rooms").select("id, room_type").eq("hotel_id", hotelId),
      sb.from("hotel_channel_connections").select("*").eq("hotel_id", hotelId).maybeSingle(),
    ]);
    setPlans(p || []); setRooms(r || []); setConnection(c || null);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const openEditor = async (plan: Plan | null) => {
    setEditing(plan ? { ...plan } : { ...blank });
    if (plan?.id) {
      const { data } = await (supabase as any)
        .from("rate_plan_cancellation_policies").select("*").eq("rate_plan_id", plan.id).order("days_before", { ascending: false });
      setPolicies(data || []);
    } else {
      setPolicies([]);
    }
  };

  const save = async () => {
    if (!editing?.rate_plan_name?.trim()) { toast.error("Rate plan name is required"); return; }
    setSaving(true);
    const sb: any = supabase;
    const payload = {
      hotel_id: hotelId,
      room_id: editing.room_id || null,
      name: editing.rate_plan_name,
      rate_plan_name: editing.rate_plan_name,
      rate_plan_code: editing.rate_plan_code || null,
      board: editing.board,
      description: editing.description || null,
      adjustment_type: editing.adjustment_type,
      adjustment_value: Number(editing.adjustment_value) || 0,
      is_refundable: editing.is_refundable,
      is_promotion: editing.is_promotion,
      is_package_rate: editing.is_package_rate,
      is_private: editing.is_private,
      is_immediate: editing.is_immediate,
      is_active: editing.is_active,
    };
    try {
      let planId = editing.id;
      if (planId) {
        const { error } = await sb.from("hotel_rate_plans").update(payload).eq("id", planId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("hotel_rate_plans").insert(payload).select().single();
        if (error) throw error;
        planId = data.id;
      }
      // Cancellation policies are replaced as a set.
      await sb.from("rate_plan_cancellation_policies").delete().eq("rate_plan_id", planId);
      const rows = policies
        .filter((p) => p.penalty_type)
        .map((p) => ({
          rate_plan_id: planId,
          days_before: p.days_before === "" ? null : Number(p.days_before),
          penalty_type: p.penalty_type,
          amount: Number(p.amount) || 0,
          currency: "INR",
          time_from_check_in: p.days_before === "" ? null : Number(p.days_before) * 24,
          time_from_check_in_type: "hours",
        }));
      if (rows.length) await sb.from("rate_plan_cancellation_policies").insert(rows);
      toast.success("Rate plan saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not save the rate plan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: Plan) => {
    const { error } = await (supabase as any).from("hotel_rate_plans").delete().eq("id", plan.id);
    if (error) return toast.error(error.message);
    toast.success("Rate plan deleted");
    load();
  };

  const channelControlled = (p: Plan) => p.source_channel && p.source_channel !== "jaaga";

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
            <h1 className="text-2xl font-semibold">Rate Plans</h1>
            <p className="text-sm text-muted-foreground">
              A room can carry many rate plans — board type, refundable or non-refundable, promotional or package rates.
            </p>
          </div>
          <Button onClick={() => openEditor(null)}>
            <Plus className="mr-1.5 h-4 w-4" /> New rate plan
          </Button>
        </div>

        {connection?.channel && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="font-medium capitalize">Channel: {connection.channel}</span>
              <Badge variant="secondary">Property ID {connection.channel_property_id ?? "—"}</Badge>
              <Badge variant={connection.status === "connected" ? "default" : "outline"}>{connection.status}</Badge>
              <span className="text-muted-foreground">
                Last sync {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "never"}
                {connection.last_sync_status ? ` · ${connection.last_sync_status}` : ""}
              </span>
              {connection.last_sync_error && (
                <span className="text-destructive">{connection.last_sync_error}</span>
              )}
            </CardContent>
          </Card>
        )}

        {!plans.length ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No rate plans yet. Rooms are sold on their base price until you add one.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      {p.rate_plan_name || p.name}
                    </span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditor(p)} disabled={channelControlled(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p)} disabled={channelControlled(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{BOARDS.find((b) => b.value === p.board)?.label ?? p.board}</Badge>
                    {p.rate_plan_code && <Badge variant="outline">{p.rate_plan_code}</Badge>}
                    <Badge variant={p.is_refundable ? "default" : "destructive"}>
                      {p.is_refundable ? "Refundable" : "Non refundable"}
                    </Badge>
                    {p.is_promotion && <Badge variant="secondary">Promotion</Badge>}
                    {p.is_package_rate && <Badge variant="secondary">Package</Badge>}
                    {p.is_private && <Badge variant="secondary">Private</Badge>}
                    {!p.is_active && <Badge variant="outline">Inactive</Badge>}
                    {channelControlled(p) && (
                      <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Channel controlled</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Price adjustment:{" "}
                    {p.adjustment_value
                      ? `${p.adjustment_value > 0 ? "+" : ""}${p.adjustment_value}${p.adjustment_type === "percent" ? "%" : " ₹"}`
                      : "base price"}
                    {p.room_id ? ` · room specific` : " · all rooms"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit rate plan" : "New rate plan"}</DialogTitle>
            <DialogDescription>Board, pricing adjustment and cancellation policy.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={editing.rate_plan_name ?? ""} onChange={(e) => setEditing({ ...editing, rate_plan_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={editing.rate_plan_code ?? ""} onChange={(e) => setEditing({ ...editing, rate_plan_code: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Board</Label>
                  <Select value={editing.board} onValueChange={(v) => setEditing({ ...editing, board: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOARDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Applies to</Label>
                  <Select value={editing.room_id || "all"} onValueChange={(v) => setEditing({ ...editing, room_id: v === "all" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All rooms</SelectItem>
                      {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Adjustment type</Label>
                  <Select value={editing.adjustment_type} onValueChange={(v) => setEditing({ ...editing, adjustment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed ₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Adjustment value</Label>
                  <Input type="number" value={editing.adjustment_value ?? 0}
                    onChange={(e) => setEditing({ ...editing, adjustment_value: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
                {([
                  ["is_refundable", "Refundable"],
                  ["is_promotion", "Promotional rate"],
                  ["is_package_rate", "Package rate"],
                  ["is_private", "Private rate"],
                  ["is_immediate", "Immediate confirmation"],
                  ["is_active", "Active"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <Switch checked={!!editing[key]} onCheckedChange={(v) => setEditing({ ...editing, [key]: v })} />
                  </label>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cancellation policy</span>
                  <Button size="sm" variant="outline"
                    onClick={() => setPolicies([...policies, { days_before: 3, penalty_type: "percent", amount: 0 }])}>
                    <Plus className="mr-1 h-3 w-3" /> Add rule
                  </Button>
                </div>
                {!policies.length && (
                  <p className="text-xs text-muted-foreground">
                    No rules — JAAGA's default ladder applies (free over 72h, 50% within 72h, 100% within 24h).
                  </p>
                )}
                {policies.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                    <div>
                      <Label className="text-[10px]">Days before</Label>
                      <Input type="number" value={p.days_before ?? ""} onChange={(e) => {
                        const next = [...policies]; next[i] = { ...p, days_before: e.target.value }; setPolicies(next);
                      }} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Penalty</Label>
                      <Select value={p.penalty_type} onValueChange={(v) => {
                        const next = [...policies]; next[i] = { ...p, penalty_type: v }; setPolicies(next);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PENALTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Amount</Label>
                      <Input type="number" value={p.amount ?? 0} onChange={(e) => {
                        const next = [...policies]; next[i] = { ...p, amount: e.target.value }; setPolicies(next);
                      }} />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setPolicies(policies.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save rate plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
