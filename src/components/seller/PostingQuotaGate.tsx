import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Crown, Loader2, IndianRupee, Sparkles } from "lucide-react";

const POSTING_FEE = 500;
const PREMIUM_FEE = 2000;

interface QuotaStatus {
  plan: string;
  posts_used: number;
  free_limit: number;
  free_remaining: number;
}

export function usePostingQuotaGate() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"wallet" | "subscribe" | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [askAgent, setAskAgent] = useState(false);

  const navigateToSell = useCallback((extra: string = "") => {
    setOpen(false);
    setAskAgent(false);
    navigate("/sell-property" + extra);
  }, [navigate]);

  const trigger = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Please sign in to list a property");
        navigate("/auth");
        return;
      }
      // @ts-ignore - custom RPC
      const { data: qData, error: qErr } = await supabase.rpc("get_posting_quota_status", { _user_id: u.user.id });
      if (qErr) throw qErr;
      const q = qData as unknown as QuotaStatus;
      setQuota(q);

      if (q && (q.plan === "premium" || q.plan === "agent_pro" || (q.free_remaining ?? 0) > 0)) {
        navigateToSell();
        return;
      }
      // Exhausted — load wallet & open dialog
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setWalletBalance(Number(wallet?.balance ?? 0));
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      // Fail-open: don't block user if quota check fails
      navigateToSell();
    } finally {
      setLoading(false);
    }
  }, [navigate, navigateToSell]);

  const payFromWallet = async () => {
    if (walletBalance < POSTING_FEE) {
      toast.error("Insufficient balance. Add money or choose subscription.");
      return;
    }
    setBusy("wallet");
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      // @ts-ignore - RPC
      const { error } = await supabase.rpc("decrement_wallet_balance", {
        _user_id: u.user.id,
        _amount: POSTING_FEE,
        _description: "Property posting fee",
        _reference: "posting_fee",
      });
      if (error) throw error;
      toast.success(`₹${POSTING_FEE} debited. Continue to list your property.`);
      navigateToSell();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const subscribePremium = async () => {
    setBusy("subscribe");
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      // Deactivate prior active subs
      await supabase
        .from("seller_subscriptions")
        .update({ is_active: false })
        .eq("user_id", u.user.id)
        .eq("is_active", true);
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("seller_subscriptions").insert({
        user_id: u.user.id,
        plan_type: "premium",
        is_active: true,
        expires_at: expires,
      });
      if (error) throw error;
      toast.success("Premium activated — unlimited posts for 30 days");
      setOpen(false);
      setAskAgent(true);
    } catch (e: any) {
      toast.error(e.message || "Subscription failed");
    } finally {
      setBusy(null);
    }
  };

  const dialog = (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Free quota used
            </DialogTitle>
            <DialogDescription>
              You've used your {quota?.free_limit ?? 1} free posting{(quota?.free_limit ?? 1) > 1 ? "s" : ""} this month.
              Choose how to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Card className={`border-2 ${walletBalance >= POSTING_FEE ? "border-emerald-500/40" : "border-muted"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Wallet className="h-4 w-4" /> Pay from Wallet
                  </div>
                  <div className="text-sm flex items-center">
                    Balance: <IndianRupee className="h-3 w-3 ml-1" />{walletBalance.toFixed(0)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">One-time charge of ₹{POSTING_FEE} for this listing.</p>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  disabled={busy !== null || walletBalance < POSTING_FEE}
                  onClick={payFromWallet}
                >
                  {busy === "wallet" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Pay ₹{POSTING_FEE} from Wallet
                </Button>
                {walletBalance < POSTING_FEE && (
                  <p className="text-xs text-amber-600">
                    Insufficient balance — top up your wallet or choose subscription.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Crown className="h-4 w-4 text-amber-500" /> Premium — Unlimited
                  </div>
                  <div className="text-sm font-semibold">₹{PREMIUM_FEE}/mo</div>
                </div>
                <p className="text-xs text-muted-foreground">Unlimited posts, priority placement, badge.</p>
                <Button
                  variant="outline"
                  className="w-full border-amber-500/60"
                  disabled={busy !== null}
                  onClick={subscribePremium}
                >
                  {busy === "subscribe" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Subscribe ₹{PREMIUM_FEE}/month
                </Button>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy !== null}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askAgent} onOpenChange={setAskAgent}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch to Agent profile?</DialogTitle>
            <DialogDescription>
              Agents get qualified leads and a public profile. Want to upgrade now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => navigateToSell()}>
              No, continue to list
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => {
                setAskAgent(false);
                navigate("/upgrade-to-agent");
              }}
            >
              Yes, upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { trigger, dialog, loading };
}
