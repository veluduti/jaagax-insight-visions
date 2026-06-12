import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Crown, Zap, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface QuotaStatus {
  plan: "free" | "premium" | "agent_pro";
  posts_used: number;
  free_limit: number;
  free_remaining: number;
}

const PLAN_META = {
  free: { label: "Free", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  premium: { label: "Premium", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  agent_pro: { label: "Agent Pro", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
};

export default function SubscriptionManager({ userId }: { userId: string }) {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const sb: any = supabase;
    const { data } = await sb.rpc("get_posting_quota_status", { _user_id: userId });
    if (data) setStatus(data as QuotaStatus);
  };
  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const subscribePremium = async () => {
    setLoading(true);
    const sb: any = supabase;
    const fee = 2000;
    const { error: payErr } = await sb.rpc("decrement_wallet_balance", {
      _user_id: userId,
      _amount: fee,
      _description: "Premium subscription (monthly)",
      _reference: `sub:premium:${Date.now()}`,
    });
    if (payErr) {
      setLoading(false);
      return toast.error(payErr.message || "Insufficient wallet balance");
    }

    // expire previous active sub, insert new
    await sb.from("seller_subscriptions").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);
    await sb.from("seller_subscriptions").insert({
      user_id: userId,
      plan_type: "premium",
      is_active: true,
      expires_at: expires.toISOString(),
    });
    setLoading(false);
    toast.success("Premium activated — unlimited posts this month");
    setOpen(false);
    setAgentPrompt(true);
    load();
  };

  if (!status) return null;
  const isPremium = status.plan !== "free";
  const meta = PLAN_META[status.plan];
  const pct = status.free_limit === 0 ? 0 : Math.min(100, (status.posts_used / status.free_limit) * 100);
  const exhausted = !isPremium && status.free_remaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-background via-background to-emerald-500/5 h-full flex flex-col">
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium uppercase tracking-wider">
              <Crown className="h-4 w-4" /> Plan & Quota
            </div>
            <Badge variant="outline" className={meta.color}>
              {meta.label}
            </Badge>
          </div>

          {isPremium ? (
            <div className="py-3">
              <p className="text-2xl font-bold text-foreground">Unlimited postings</p>
              <p className="text-xs text-muted-foreground mt-1">Active until next billing cycle</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Free posting quota</p>
                <p className="text-sm">
                  <span className="font-bold text-foreground">{status.free_remaining}</span>
                  <span className="text-foreground/60"> / {status.free_limit} remaining</span>
                </p>
              </div>
              <Progress value={pct} className="h-2 mb-3" />
              {exhausted && (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 mb-3">
                  Free quota used. Upgrade to Premium for unlimited posts, or pay ₹500 per post from wallet.
                </div>
              )}
            </div>
          )}

          <div className="mt-auto pt-3">
            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-1" /> {isPremium ? "Manage plan" : "Upgrade plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>Posting fees are auto-deducted from your wallet.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Pay-per-post</p>
                    <p className="text-xs text-muted-foreground mt-1">₹500 per additional listing after free quota</p>
                  </div>
                  <Badge variant="outline">₹500 / post</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold flex items-center gap-1 text-foreground">
                      Premium <Crown className="h-4 w-4 text-emerald-400" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unlimited posts, priority review, premium badge
                    </p>
                  </div>
                  <Badge className="bg-emerald-500 text-white">₹2,000 / mo</Badge>
                </div>
                <Button
                  onClick={subscribePremium}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="sm"
                >
                  {loading ? "Activating…" : "Subscribe — debit ₹2,000 from wallet"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={agentPrompt} onOpenChange={setAgentPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" /> Get leads as an Agent
            </DialogTitle>
            <DialogDescription>
              You're now on Premium. Switch to an Agent profile to start receiving buyer leads, gain trust score, and
              rank on the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-2 py-2">
            {["Receive matched buyer leads", "Build a verified agent profile", "Earn XP on the leaderboard"].map(
              (b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> <span className="text-foreground">{b}</span>
                </li>
              ),
            )}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentPrompt(false)}>
              Maybe later
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => navigate("/select-profile")}
            >
              Switch to Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
