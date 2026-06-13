import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Gift, Copy, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Referral = {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  referred_user_type: string | null;
  status: string;
  reward_amount: number | null;
  created_at: string;
  converted_at: string | null;
};

export default function AgentReferralProgram() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [myCode, setMyCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("agent_referrals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data || []) as Referral[];
    setReferrals(list);

    if (list.length === 0) {
      const code = `AGT-${user.id.slice(0, 6).toUpperCase()}`;
      await (supabase as any).from("agent_referrals").insert({
        user_id: user.id, referral_code: code, status: "active",
      });
      setMyCode(code);
      load();
      return;
    }
    setMyCode(list[0].referral_code);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const link = `${window.location.origin}/auth?ref=${myCode}`;
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const converted = referrals.filter((r) => r.status === "converted");
  const totalEarnings = converted.reduce((s, r) => s + Number(r.reward_amount || 0), 0);
  const buyers = referrals.filter((r) => r.referred_user_type === "buyer").length;
  const agents = referrals.filter((r) => r.referred_user_type === "agent").length;
  const upgrades = referrals.filter((r) => r.referred_user_type === "premium").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Referral Program</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded text-center"><p className="text-2xl font-bold">₹{totalEarnings}</p><p className="text-xs text-muted-foreground">Earnings</p></div>
          <div className="p-3 bg-muted/30 rounded text-center"><p className="text-2xl font-bold">{buyers}</p><p className="text-xs text-muted-foreground">Buyers</p></div>
          <div className="p-3 bg-muted/30 rounded text-center"><p className="text-2xl font-bold">{agents}</p><p className="text-xs text-muted-foreground">Agents</p></div>
          <div className="p-3 bg-muted/30 rounded text-center"><p className="text-2xl font-bold">{upgrades}</p><p className="text-xs text-muted-foreground">Premium Upgrades</p></div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Your Referral Code</p>
          <div className="flex gap-2">
            <Input value={myCode} readOnly className="font-mono" />
            <Button variant="outline" onClick={() => copy(myCode)}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-sm font-medium pt-2">Referral Link</p>
          <div className="flex gap-2">
            <Input value={link} readOnly className="text-xs" />
            <Button variant="outline" onClick={() => copy(link)}><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Recent Referrals</h4>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet. Share your code to start earning!</p>
          ) : referrals.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between p-2 border rounded text-sm">
              <span>{r.referred_user_type || "Pending signup"} · {new Date(r.created_at).toLocaleDateString()}</span>
              <Badge variant={r.status === "converted" ? "default" : "outline"}>
                {r.status === "converted" ? `Closed · ₹${r.reward_amount || 0}` : r.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
