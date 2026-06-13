import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRICING: Record<string, Record<number, number>> = {
  sponsored: { 7: 499, 14: 899, 30: 1499 },
  featured: { 7: 799, 14: 1399, 30: 2499 },
  boost: { 7: 999, 14: 1799, 30: 2999 },
};

export default function AgentPremiumPromotion() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [wallet, setWallet] = useState(0);
  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState<keyof typeof PRICING>("sponsored");
  const [duration, setDuration] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: props }, { data: w }] = await Promise.all([
        (supabase as any).from("properties").select("id, title").eq("submitted_by", user.id).eq("is_live", true),
        (supabase as any).from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setProperties(props || []);
      setWallet(Number(w?.balance || 0));
      setLoading(false);
    })();
  }, [user]);

  const price = PRICING[type][duration];

  const activate = async () => {
    if (!user || !propertyId) { toast.error("Select a property"); return; }
    if (wallet < price) { toast.error(`Insufficient balance. Need ₹${price}`); return; }
    setSubmitting(true);
    try {
      const { error: dErr } = await (supabase as any).rpc("decrement_wallet_balance", {
        _user_id: user.id, _amount: price,
        _description: `${type} promotion (${duration}d)`, _reference: `promo:${propertyId}`,
      });
      if (dErr) throw dErr;

      const end = new Date(); end.setDate(end.getDate() + duration);
      const { error } = await (supabase as any).from("agent_promotions").insert({
        user_id: user.id, property_id: propertyId, promotion_type: type,
        amount: price, end_date: end.toISOString(), status: "active",
      });
      if (error) throw error;

      if (type === "featured" || type === "boost") {
        await (supabase as any).rpc("mark_property_featured", {
          _property_id: propertyId, _days: duration, _payment_ref: `promo:${type}`,
        });
      }
      toast.success("Promotion activated!");
      setWallet(wallet - price);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Premium Property Promotion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Property</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="Select your property" /></SelectTrigger>
            <SelectContent>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Promotion Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sponsored">Sponsored</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="boost">Boost (Top of Search)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">₹{price}</p>
          </div>
          <Badge variant="outline">Wallet: ₹{wallet}</Badge>
        </div>

        <Button onClick={activate} disabled={submitting || !propertyId} className="w-full gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Activate Promotion
        </Button>
      </CardContent>
    </Card>
  );
}
