import { useEffect, useState } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, Sparkles, Star, Trophy } from "lucide-react";

const PACKAGES = [
  { key: "homepage_featured", title: "Homepage Featured", pricePerDay: 299, durations: [1, 7, 30], icon: Sparkles,
    desc: "Top placement on homepage carousel for instant brand visibility." },
  { key: "top_search", title: "Top Search Placement", pricePerDay: 499, durations: [1, 7, 30], icon: Star,
    desc: "Appear first in buyer search results for your service area." },
  { key: "preferred_partner", title: "Preferred Financial Partner", pricePerMonth: 2999, durations: [1, 3, 6], icon: Crown, monthly: true,
    desc: "Display a Preferred Partner ribbon across the platform." },
  { key: "premium_badge", title: "Premium Verified Badge", pricePerMonth: 1999, durations: [1, 3, 6], icon: Trophy, monthly: true,
    desc: "Elite verified badge with priority listing and trust boost." },
];

export default function FinancialPromotions() {
  const [balance, setBalance] = useState(0);
  const [promos, setPromos] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [duration, setDuration] = useState<Record<string, number>>({});

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: w }, { data: prov }] = await Promise.all([
      (supabase as any).from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
      (supabase as any).from("financial_providers").select("id").eq("user_id", u.user.id).maybeSingle(),
    ]);
    setBalance(Number(w?.balance ?? 0));
    if (prov?.id) {
      setProviderId(prov.id);
      const { data: p } = await (supabase as any).from("financial_promotions")
        .select("*").eq("provider_id", prov.id).order("created_at", { ascending: false });
      setPromos(p ?? []);
    }
  }
  useEffect(() => { load(); }, []);

  async function buy(pkg: typeof PACKAGES[number]) {
    const dur = duration[pkg.key] ?? pkg.durations[0];
    const days = pkg.monthly ? dur * 30 : dur;
    const amount = pkg.monthly ? pkg.pricePerMonth! * dur : pkg.pricePerDay! * dur;
    if (balance < amount) { toast.error(`Need ₹${amount}, wallet has ₹${balance}`); return; }
    const { error } = await (supabase as any).rpc("purchase_financial_promotion",
      { _package_type: pkg.key, _amount: amount, _duration_days: days });
    if (error) { toast.error(error.message); return; }
    toast.success(`${pkg.title} activated for ${dur} ${pkg.monthly ? "month(s)" : "day(s)"}`);
    load();
  }

  return (
    <FinancialLayout title="Promotion Packages" subtitle="Boost your visibility and lead flow">
      <Card className="border-border bg-gradient-to-r from-amber-950/30 to-black backdrop-blur-md">
        <CardContent className="py-4 flex justify-between items-center">
          <span className="text-sm text-foreground">Wallet Balance</span>
          <span className="text-2xl font-bold text-primary">₹{balance.toLocaleString()}</span>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const dur = duration[pkg.key] ?? pkg.durations[0];
          const amount = pkg.monthly ? pkg.pricePerMonth! * dur : pkg.pricePerDay! * dur;
          return (
            <Card key={pkg.key} className="border-border bg-card backdrop-blur-md hover:border-border transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-primary">{pkg.title}</CardTitle>
                    <p className="text-xs text-primary">
                      {pkg.monthly ? `₹${pkg.pricePerMonth}/month` : `₹${pkg.pricePerDay}/day`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-foreground">{pkg.desc}</p>
                <div className="flex gap-2 items-center">
                  <Select value={String(dur)} onValueChange={(v) => setDuration({ ...duration, [pkg.key]: Number(v) })}>
                    <SelectTrigger className="bg-card border-border w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pkg.durations.map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} {pkg.monthly ? "month(s)" : "day(s)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-primary font-semibold">Total: ₹{amount.toLocaleString()}</p>
                </div>
                <Button onClick={() => buy(pkg)} className="w-full bg-primary text-primary-foreground font-semibold">
                  Purchase
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card backdrop-blur-md">
        <CardHeader><CardTitle className="text-primary text-base">Active & Past Promotions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {promos.length === 0 ? <p className="text-sm text-muted-foreground">No promotions yet.</p> :
            promos.map((p) => {
              const active = p.is_active && new Date(p.end_date) > new Date();
              const daysLeft = Math.max(0, Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000));
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="font-semibold capitalize text-primary">{p.package_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">₹{Number(p.amount).toLocaleString()} · {p.duration_days} days · ends {new Date(p.end_date).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Impressions: {Math.floor(Math.random() * 2000)} · Clicks: {Math.floor(Math.random() * 200)}</p>
                  </div>
                  <Badge className={active ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-700/50 text-muted-foreground"}>
                    {active ? `Active · ${daysLeft}d left` : "Expired"}
                  </Badge>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </FinancialLayout>
  );
}
