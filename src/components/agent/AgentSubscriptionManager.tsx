import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Check, Crown, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { startWalletTopUp } from "@/lib/razorpayCheckout";
import { toast } from "sonner";

const COVERED_SERVICES = [
  { icon: Home, label: "Property Posting — unlimited listings, no per-post charges" },
  { icon: CalendarCheck, label: "Visit Schedule Booking — unlimited visits, no per-visit charges" },
];

const BENEFITS = [
  "Premium Visibility",
  "AI Lead Recommendations",
  "Featured Properties",
  "Advanced Analytics",
  "Priority Leads",
  "Verified Gold Badge",
  "AI Smart Promotions",
  "Dedicated Relationship Manager",
];

const money = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function AgentSubscriptionManager() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: s }, { data: cfg }] = await Promise.all([
      (supabase as any)
        .from("agent_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any).from("platform_pricing_settings").select("*").limit(1).maybeSingle(),
    ]);
    setSub(s);
    setSettings(cfg);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const price = Number(settings?.agent_subscription_price || 0);
  const gstPct = Number(settings?.agent_subscription_gst_percent || 0);
  const gst = Math.round(price * gstPct) / 100;
  const total = price + gst;
  const currency = settings?.currency || "INR";
  const cycle = settings?.agent_billing_cycle || "monthly";
  const enabled = settings?.agent_subscription_enabled !== false;

  const subscribe = async () => {
    if (!user) return;
    if (!(total > 0)) {
      toast.error("Subscription price is not configured yet.");
      return;
    }
    setSubscribing(true);
    try {
      // Direct Razorpay payment for the exact subscription amount
      await startWalletTopUp(Math.max(Math.ceil(total), 500), {
        name: (user as any)?.user_metadata?.full_name,
        email: user.email,
        contact: (user as any)?.user_metadata?.phone,
      });
      const { data, error } = await (supabase as any).rpc("purchase_agent_subscription", { _user_id: user.id });
      if (error) throw error;
      if (!data?.ok) {
        const reasons: Record<string, string> = {
          insufficient_funds: "Payment received but subscription could not be activated. Please contact support.",
          subscription_disabled: "Agent subscriptions are currently disabled by the admin.",
          forbidden: "You are not allowed to perform this action.",
        };
        toast.error(reasons[data?.reason] || "Subscription failed");
        return;
      }
      toast.success("Agent subscription activated!", { description: `Invoice ${data.invoice_number}` });
      window.dispatchEvent(new Event("walletUpdated"));
      await load();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );

  const active = sub && new Date(sub.end_date) > new Date();
  const daysLeft = active ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000) : 0;

  return (
    <Card className="border-yellow-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" /> Agent Subscription
          </CardTitle>
          {active ? (
            <Badge className="bg-green-600">Active • {daysLeft}d left</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-bold">
            {money(total, currency)}
            <span className="text-sm text-muted-foreground font-normal">/{cycle}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {money(price, currency)} + {gstPct}% GST ({money(gst, currency)})
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600 shrink-0" /> {b}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Wallet Balance: <strong className="text-foreground">{money(wallet, currency)}</strong>
          </span>
          {!active && (
            <Button variant="premium" onClick={subscribe} disabled={subscribing || !enabled}>
              {subscribing && <Loader2 className="h-4 w-4 animate-spin" />}
              {enabled ? "Subscribe Now" : "Unavailable"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
