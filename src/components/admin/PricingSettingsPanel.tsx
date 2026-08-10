import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Settings2, Receipt, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Settings {
  id: string;
  free_posts_limit: number;
  pay_per_post_enabled: boolean;
  posting_fee: number;
  posting_gst_percent: number;
  currency: string;
  agent_subscription_enabled: boolean;
  agent_subscription_price: number;
  agent_subscription_gst_percent: number;
  agent_billing_cycle: string;
  agent_trial_days: number;
  agent_trial_free_posts: number;
  agent_subscription_duration_days: number;
  free_visits_limit: number;
  visit_booking_paid_enabled: boolean;
  visit_fee: number;
  visit_gst_percent: number;
}

const money = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function PricingSettingsPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [txns, setTxns] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: row, error }, { data: t }] = await Promise.all([
      (supabase as any).from("platform_pricing_settings").select("*").limit(1).maybeSingle(),
      (supabase as any)
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (error) toast.error("Could not load pricing settings");
    setS(row as Settings);
    setTxns(t || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const set = (patch: Partial<Settings>) => setS((prev) => (prev ? { ...prev, ...patch } : prev));

  const save = async () => {
    if (!s) return;
    if (s.free_posts_limit < 0 || s.posting_fee < 0 || s.posting_gst_percent < 0 || s.agent_subscription_price < 0) {
      toast.error("Values cannot be negative");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("platform_pricing_settings")
      .update({
        free_posts_limit: Math.round(s.free_posts_limit),
        pay_per_post_enabled: s.pay_per_post_enabled,
        posting_fee: s.posting_fee,
        posting_gst_percent: s.posting_gst_percent,
        currency: s.currency,
        agent_subscription_enabled: s.agent_subscription_enabled,
        agent_subscription_price: s.agent_subscription_price,
        agent_subscription_gst_percent: s.agent_subscription_gst_percent,
        agent_billing_cycle: s.agent_billing_cycle,
        agent_trial_days: Math.round(s.agent_trial_days ?? 0),
        agent_trial_free_posts: Math.round(s.agent_trial_free_posts ?? 0),
        agent_subscription_duration_days: Math.round(s.agent_subscription_duration_days ?? 30),
        free_visits_limit: Math.round(s.free_visits_limit ?? 0),
        visit_booking_paid_enabled: s.visit_booking_paid_enabled,
        visit_fee: s.visit_fee,
        visit_gst_percent: s.visit_gst_percent,
      })
      .eq("id", s.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Save failed — admin access required");
      return;
    }
    toast.success("Pricing settings saved");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="p-6 text-muted-foreground">Pricing settings unavailable.</div>
    );
  }

  const postingTotal = Number(s.posting_fee) * (1 + Number(s.posting_gst_percent) / 100);
  const subTotal = Number(s.agent_subscription_price) * (1 + Number(s.agent_subscription_gst_percent) / 100);

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Monetisation Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure free posts, pay-per-property pricing and agent subscriptions. Nothing is hardcoded.
            </p>
          </div>
        </div>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings" className="gap-1.5">
              <IndianRupee className="h-4 w-4" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              <Receipt className="h-4 w-4" /> Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4 space-y-6">
            {/* Module 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Free Property Posts</CardTitle>
                <CardDescription>Number of free listings every customer gets.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="free">Number of Free Posts</Label>
                  <Input
                    id="free"
                    type="number"
                    min={0}
                    value={s.free_posts_limit}
                    onChange={(e) => set({ free_posts_limit: Number(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Module 2 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Property Posting Fee</CardTitle>
                    <CardDescription>Charged once free posts are exhausted.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ppp" className="text-xs text-muted-foreground">
                      {s.pay_per_post_enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="ppp"
                      checked={s.pay_per_post_enabled}
                      onCheckedChange={(v) => set({ pay_per_post_enabled: v })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fee">Posting Price</Label>
                  <Input
                    id="fee"
                    type="number"
                    min={0}
                    value={s.posting_fee}
                    onChange={(e) => set({ posting_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gst">GST %</Label>
                  <Input
                    id="gst"
                    type="number"
                    min={0}
                    value={s.posting_gst_percent}
                    onChange={(e) => set({ posting_gst_percent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cur">Currency</Label>
                  <Select value={s.currency} onValueChange={(v) => set({ currency: v })}>
                    <SelectTrigger id="cur">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3 text-sm text-muted-foreground">
                  Customer pays <strong className="text-foreground">{money(postingTotal, s.currency)}</strong> per
                  listing (fee + GST).
                </div>
              </CardContent>
            </Card>

            {/* Module 3 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agent Subscription</CardTitle>
                    <CardDescription>Applies only to agents. Replaces pay-per-property.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="subon" className="text-xs text-muted-foreground">
                      {s.agent_subscription_enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="subon"
                      checked={s.agent_subscription_enabled}
                      onCheckedChange={(v) => set({ agent_subscription_enabled: v })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sp">Price</Label>
                  <Input
                    id="sp"
                    type="number"
                    min={0}
                    value={s.agent_subscription_price}
                    onChange={(e) => set({ agent_subscription_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sg">GST %</Label>
                  <Input
                    id="sg"
                    type="number"
                    min={0}
                    value={s.agent_subscription_gst_percent}
                    onChange={(e) => set({ agent_subscription_gst_percent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cycle">Billing Cycle</Label>
                  <Select value={s.agent_billing_cycle} onValueChange={(v) => set({ agent_billing_cycle: v })}>
                    <SelectTrigger id="cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="td">Trial Days</Label>
                  <Input
                    id="td"
                    type="number"
                    min={0}
                    value={s.agent_trial_days ?? 0}
                    onChange={(e) => set({ agent_trial_days: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tfp">Free Property Posts (trial)</Label>
                  <Input
                    id="tfp"
                    type="number"
                    min={0}
                    value={s.agent_trial_free_posts ?? 0}
                    onChange={(e) => set({ agent_trial_free_posts: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sdd">Subscription Duration (days)</Label>
                  <Input
                    id="sdd"
                    type="number"
                    min={1}
                    value={s.agent_subscription_duration_days ?? 30}
                    onChange={(e) => set({ agent_subscription_duration_days: Number(e.target.value) })}
                  />
                </div>
                <div className="sm:col-span-3 text-sm text-muted-foreground">
                  New agents get {s.agent_trial_days ?? 0} days or {s.agent_trial_free_posts ?? 0} free listings, then
                  pay <strong className="text-foreground">{money(subTotal, s.currency)}</strong> per{" "}
                  {s.agent_billing_cycle} cycle (price + GST).
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Latest 100 posting and subscription transactions.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {txns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="text-left border-b border-border">
                        <th className="py-2 pr-4">Invoice</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">GST</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t) => (
                        <tr key={t.id} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">{t.invoice_number}</td>
                          <td className="py-2 pr-4 capitalize">{String(t.purpose).replace(/_/g, " ")}</td>
                          <td className="py-2 pr-4">{money(t.base_amount, t.currency)}</td>
                          <td className="py-2 pr-4">{money(t.gst_amount, t.currency)}</td>
                          <td className="py-2 pr-4 font-medium">{money(t.total_amount, t.currency)}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={t.status === "success" ? "default" : "outline"}>{t.status}</Badge>
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
