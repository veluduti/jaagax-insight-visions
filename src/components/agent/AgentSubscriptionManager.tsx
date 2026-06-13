import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLAN_PRICE = 2999;
const BENEFITS = [
  "Unlimited Listings",
  "Premium Visibility",
  "AI Lead Recommendations",
  "Featured Properties",
  "Advanced Analytics",
  "Priority Leads",
  "Verified Gold Badge",
  "AI Smart Promotions",
  "Dedicated Relationship Manager",
];

export default function AgentSubscriptionManager() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [wallet, setWallet] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: s }, { data: w }] = await Promise.all([
      (supabase as any)
        .from("agent_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any).from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setSub(s);
    setWallet(Number(w?.balance || 0));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const subscribe = async () => {
    if (!user) return;
    if (wallet < PLAN_PRICE) {
      toast.error(`Insufficient wallet balance. Need ₹${PLAN_PRICE}, have ₹${wallet}`);
      return;
    }
    setSubscribing(true);
    try {
      const { error: debitErr } = await (supabase as any).rpc("decrement_wallet_balance", {
        _user_id: user.id,
        _amount: PLAN_PRICE,
        _description: "Pro Agent Plan subscription",
        _reference: `sub:${Date.now()}`,
      });
      if (debitErr) throw debitErr;

      const end = new Date();
      end.setDate(end.getDate() + 30);
      const { error: insErr } = await (supabase as any).from("agent_subscriptions").insert({
        user_id: user.id,
        plan_type: "pro",
        plan_name: "Pro Agent Plan",
        price: PLAN_PRICE,
        is_active: true,
        end_date: end.toISOString(),
        benefits: BENEFITS,
      });
      if (insErr) throw insErr;
      toast.success("Subscribed to Pro Agent Plan!");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Subscription failed");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const active = sub && new Date(sub.end_date) > new Date();
  const daysLeft = active ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000) : 0;

  return (
    <Card className="border-yellow-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" /> Pro Agent Plan</CardTitle>
          {active ? <Badge className="bg-green-600">Active • {daysLeft}d left</Badge> : <Badge variant="outline">Inactive</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">₹{PLAN_PRICE}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600 shrink-0" /> {b}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Wallet Balance: <strong className="text-foreground">₹{wallet}</strong></span>
          {!active && (
            <Button variant="premium" onClick={subscribe} disabled={subscribing}>
              {subscribing && <Loader2 className="h-4 w-4 animate-spin" />} Subscribe Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
