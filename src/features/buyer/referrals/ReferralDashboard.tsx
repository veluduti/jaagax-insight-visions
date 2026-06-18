import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Mail, Share2, Users, Trophy, IndianRupee, Gift, MessageCircle, Link as LinkIcon } from "lucide-react";

interface ReferralEvent {
  id: string;
  referee_name: string | null;
  source: string;
  status: "pending" | "completed";
  reward_amount: number;
  completed_at: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<string, string> = {
  buyer: "Buyer Referral",
  agent: "Agent Referral",
  property_post: "Property Posting",
};

export function ReferralDashboard() {
  const [code, setCode] = useState<string>("");
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const shareLink = useMemo(
    () => (code ? `${window.location.origin}/?ref=${encodeURIComponent(code)}` : ""),
    [code],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: codeData, error: codeErr } = await (supabase as any).rpc("get_or_create_referral_code");
    if (codeErr) toast.error(codeErr.message);
    if (codeData) setCode(String(codeData));

    const { data, error } = await (supabase as any)
      .from("buyer_referral_events")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setEvents((data as ReferralEvent[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let chan: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      chan = supabase
        .channel("buyer_referrals:" + user.id)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "buyer_referral_events", filter: `referrer_id=eq.${user.id}` },
          () => load())
        .subscribe();
    })();
    return () => { if (chan) supabase.removeChannel(chan); };
  }, [load]);

  const stats = useMemo(() => {
    const total = events.length;
    const completed = events.filter((e) => e.status === "completed").length;
    const rewards = events.filter((e) => e.status === "completed")
      .reduce((s, e) => s + Number(e.reward_amount || 0), 0);
    const byBuyer = events.filter((e) => e.source === "buyer" && e.status === "completed")
      .reduce((s, e) => s + Number(e.reward_amount || 0), 0);
    const byAgent = events.filter((e) => e.source === "agent" && e.status === "completed")
      .reduce((s, e) => s + Number(e.reward_amount || 0), 0);
    const byPost = events.filter((e) => e.source === "property_post" && e.status === "completed")
      .reduce((s, e) => s + Number(e.reward_amount || 0), 0);
    return { total, completed, rewards, byBuyer, byAgent, byPost };
  }, [events]);

  const copy = async (text: string, label = "Copied!") => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error("Copy failed"); }
  };

  const shareWhatsApp = () => {
    const msg = `Join me on JAAGA — India's smartest real estate platform. Use my code ${code} to sign up: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareEmail = () => {
    const subject = "Join me on JAAGA";
    const body = `Hey,%0A%0AI'm using JAAGA to find/sell properties. Sign up with my referral code ${code}:%0A${shareLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* Code & Share */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={loading ? "Loading…" : code} readOnly className="font-mono text-base sm:text-lg tracking-wider" />
            <Button onClick={() => copy(code, "Code copied")} disabled={!code} className="gap-2">
              <Copy className="h-4 w-4" /> Copy Code
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={shareWhatsApp} disabled={!code} className="gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={shareEmail} disabled={!code} className="gap-2">
              <Mail className="h-4 w-4" /> Email
            </Button>
            <Button variant="outline" onClick={() => copy(shareLink, "Link copied")} disabled={!code} className="gap-2">
              <LinkIcon className="h-4 w-4" /> Copy Link
            </Button>
            {typeof navigator !== "undefined" && (navigator as any).share && (
              <Button variant="outline" onClick={() => (navigator as any).share({ title: "JAAGA", text: `Join with code ${code}`, url: shareLink })} className="gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Total Referrals" value={stats.total.toString()} />
        <StatCard icon={<Trophy className="h-5 w-5 text-emerald-500" />} label="Successful" value={stats.completed.toString()} />
        <StatCard icon={<IndianRupee className="h-5 w-5 text-amber-500" />} label="Rewards Earned" value={`₹${stats.rewards.toLocaleString("en-IN")}`} />
      </div>

      {/* Reward breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Rewards Breakdown</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <RewardRow label="Referring Buyers" amount={stats.byBuyer} />
          <RewardRow label="Referring Agents" amount={stats.byAgent} />
          <RewardRow label="Posting Properties" amount={stats.byPost} />
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Referral History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : events.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No referrals yet. Share your code to start earning.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{e.referee_name || "—"}</TableCell>
                      <TableCell className="text-sm">{SOURCE_LABEL[e.source] || e.source}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "completed" ? "default" : "secondary"}>
                          {e.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{Number(e.reward_amount || 0).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RewardRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <span className="font-semibold">₹{amount.toLocaleString("en-IN")}</span>
    </div>
  );
}

export default ReferralDashboard;
