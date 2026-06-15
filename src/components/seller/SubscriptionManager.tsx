import { useEffect, useState, useRef } from "react";
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
import { Crown, Zap, Users, CheckCircle2, Wallet, RefreshCw, Sparkles } from "lucide-react";
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
  free: { label: "Free", bgColor: "bg-emerald-600", textColor: "text-white", icon: Sparkles },
  premium: { label: "Premium", bgColor: "bg-purple-600", textColor: "text-white", icon: Crown },
  agent_pro: { label: "Agent Pro", bgColor: "bg-amber-600", textColor: "text-white", icon: Users },
};

// Cache outside component for persistence across re-renders
let quotaCache: QuotaStatus | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export default function SubscriptionManager({ userId }: { userId: string }) {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payPerPostLoading, setPayPerPostLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  const load = async (skipCache = false) => {
    // Check cache first (unless skipCache is true)
    const now = Date.now();
    if (!skipCache && quotaCache && now - lastFetchTime < CACHE_DURATION) {
      if (mountedRef.current) {
        setStatus(quotaCache);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);

    // Retry logic with exponential backoff
    const fetchWithRetry = async (retries = 2, delay = 500) => {
      const sb: any = supabase;
      for (let i = 0; i <= retries; i++) {
        try {
          const { data, error } = await sb.rpc("get_posting_quota_status", { _user_id: userId });

          if (error) throw error;

          if (data && mountedRef.current) {
            quotaCache = data;
            lastFetchTime = Date.now();
            setStatus(data);
            setIsLoading(false);
            return data;
          }
        } catch (err) {
          console.warn(`Attempt ${i + 1} failed:`, err);
          if (i === retries) {
            // Last retry failed - use fallback data
            if (mountedRef.current) {
              const fallbackData: QuotaStatus = { plan: "free", posts_used: 0, free_limit: 1, free_remaining: 1 };
              setStatus(fallbackData);
              setIsLoading(false);
              toast.error("Could not load plan details. Using default values.");
            }
            return null;
          }
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
      return null;
    };

    await fetchWithRetry();
  };

  useEffect(() => {
    mountedRef.current = true;
    if (userId) load();

    // Listen for wallet updates (refresh cache on wallet changes)
    const handleWalletUpdate = () => {
      quotaCache = null; // Clear cache on wallet update
      load(true); // Force refresh
    };
    window.addEventListener("walletUpdated", handleWalletUpdate);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("walletUpdated", handleWalletUpdate);
    };
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    quotaCache = null; // Clear cache
    await load(true); // Force refresh
    setRefreshing(false);
    toast.success("Plan details refreshed");
  };

  const handlePayPerPost = async () => {
    setPayPerPostLoading(true);
    const sb: any = supabase;

    const { data: wallet } = await sb.from("wallets").select("balance").eq("user_id", userId).single();

    if (!wallet || wallet.balance < 500) {
      toast.error("Insufficient wallet balance. Please add money first.");
      setPayPerPostLoading(false);
      return;
    }

    const { error: deductError } = await sb.rpc("decrement_wallet_balance", {
      _user_id: userId,
      _amount: 500,
      _description: "Pay-per-post for additional property listing",
      _reference: `post:${Date.now()}`,
    });

    if (deductError) {
      toast.error(deductError.message || "Payment failed");
      setPayPerPostLoading(false);
      return;
    }

    const { data: walletData } = await sb.from("wallets").select("id").eq("user_id", userId).single();

    await sb.from("wallet_transactions").insert({
      user_id: userId,
      wallet_id: walletData.id,
      amount: 500,
      type: "debit",
      category: "posting_fee",
      description: "Pay-per-post for additional property",
      status: "completed",
    });

    toast.success("₹500 deducted from wallet. You can now post your property!");
    setOpen(false);
    setPayPerPostLoading(false);

    // Clear cache and trigger refresh
    quotaCache = null;
    window.dispatchEvent(new Event("walletUpdated"));
    navigate("/sell-property");
  };

  const subscribePremium = async () => {
    setLoading(true);
    const sb: any = supabase;
    const fee = 2000;

    const { data: wallet } = await sb.from("wallets").select("balance").eq("user_id", userId).single();

    if (!wallet || wallet.balance < fee) {
      toast.error(`Insufficient wallet balance. Need ₹${fee} to subscribe.`);
      setLoading(false);
      return;
    }

    const { error: payErr } = await sb.rpc("decrement_wallet_balance", {
      _user_id: userId,
      _amount: fee,
      _description: "Premium subscription (monthly)",
      _reference: `sub:premium:${Date.now()}`,
    });

    if (payErr) {
      setLoading(false);
      return toast.error(payErr.message || "Payment failed");
    }

    await sb.from("seller_subscriptions").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);
    await sb.from("seller_subscriptions").insert({
      user_id: userId,
      plan_type: "premium",
      is_active: true,
      expires_at: expires.toISOString(),
    });

    const { data: walletData } = await sb.from("wallets").select("id").eq("user_id", userId).single();

    await sb.from("wallet_transactions").insert({
      user_id: userId,
      wallet_id: walletData.id,
      amount: fee,
      type: "debit",
      category: "subscription",
      description: "Premium subscription - Unlimited posts",
      status: "completed",
    });

    setLoading(false);
    toast.success("Premium activated — unlimited posts this month!");
    setOpen(false);
    setAgentPrompt(true);

    // Clear cache and trigger refresh
    quotaCache = null;
    window.dispatchEvent(new Event("walletUpdated"));
    load(true);
  };

  // Show loading skeleton while fetching data
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-background h-full flex flex-col shadow-lg">
          <CardContent className="p-5 flex-1 flex flex-col gap-4">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            </div>

            {/* Content Skeleton */}
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-2 bg-muted rounded-full animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded mt-2 animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>

            {/* Button Skeleton */}
            <div className="mt-auto pt-2">
              <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!status) return null;
  const isPremium = status.plan !== "free";
  const meta = PLAN_META[status.plan];
  const PlanIcon = meta.icon;
  const pct = status.free_limit === 0 ? 0 : Math.min(100, (status.posts_used / status.free_limit) * 100);
  const exhausted = !isPremium && status.free_remaining <= 0;
  const remainingPercentage = (status.free_remaining / status.free_limit) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-background h-full flex flex-col shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Decorative blur effect */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <CardContent className="p-5 relative flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Crown className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Plan & Quota</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={`${meta.bgColor} ${meta.textColor} border-0 px-2 py-0.5 text-xs font-medium`}>
                <PlanIcon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-purple-500"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Content */}
          {isPremium ? (
            <div className="py-3 text-center">
              <div className="inline-flex p-3 rounded-full bg-purple-500/10 mb-3">
                <Crown className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-xl font-bold text-foreground">Unlimited Postings</p>
              <p className="text-xs text-muted-foreground mt-1">Active until next billing cycle</p>
              {status.plan === "premium" && (
                <div className="mt-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <p className="text-xs text-purple-400">⭐ Priority review & Premium badge active</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quota Display */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Free Posting Quota</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-emerald-400">{status.free_remaining}</span>
                    <span className="text-xs text-muted-foreground">/ {status.free_limit}</span>
                  </div>
                </div>
                <Progress value={remainingPercentage} className="h-2 bg-emerald-500/10" />
                <p className="text-xs text-muted-foreground mt-2">
                  {status.free_remaining > 0
                    ? `✨ You have ${status.free_remaining} free post${status.free_remaining > 1 ? "s" : ""} remaining this month`
                    : "⚠️ Free quota exhausted. Upgrade or pay per post."}
                </p>
              </div>

              {/* Usage Info */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Posts used this month</span>
                <span className="font-medium text-foreground">
                  {status.posts_used} / {status.free_limit}
                </span>
              </div>
            </div>
          )}

          {/* Upgrade Button */}
          <div className="mt-auto pt-2">
            <Button
              onClick={() => setOpen(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-medium shadow-lg shadow-purple-500/20 transition-all duration-300"
            >
              <Zap className="h-4 w-4 mr-1" />
              {isPremium ? "Manage Plan" : "Upgrade Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription>Select the plan that works best for you</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Pay-per-post Option */}
            <div
              className="relative rounded-xl border-2 border-border hover:border-emerald-500/50 transition-all cursor-pointer hover:shadow-lg overflow-hidden group"
              onClick={handlePayPerPost}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="p-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10">
                      <Wallet className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-base">Pay-per-post</p>
                      <p className="text-xs text-muted-foreground">Pay only when you need to post</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white border-0 px-3 py-1">₹500</Badge>
                </div>
                <div className="mt-3 pl-11">
                  <p className="text-xs text-muted-foreground">✓ ₹500 per additional listing after free quota</p>
                  <p className="text-xs text-muted-foreground mt-0.5">✓ No recurring charges</p>
                  <p className="text-xs text-muted-foreground mt-0.5">✓ Perfect for occasional sellers</p>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePayPerPost();
                  }}
                  disabled={payPerPostLoading}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                >
                  {payPerPostLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    "Pay ₹500 from Wallet"
                  )}
                </Button>
              </div>
            </div>

            {/* Premium Subscription Option */}
            <div className="relative rounded-xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-lg transition-all overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="p-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/15">
                      <Crown className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-base">Premium</p>
                      <p className="text-xs text-muted-foreground">Best value for active sellers</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white border-0 px-3 py-1">
                    ₹2,000<span className="text-xs">/mo</span>
                  </Badge>
                </div>
                <div className="mt-3 pl-11">
                  <p className="text-xs text-emerald-400">✓ Unlimited posts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">✓ Priority review for faster approval</p>
                  <p className="text-xs text-muted-foreground mt-0.5">✓ Premium badge on listings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">✓ Priority customer support</p>
                </div>
                <Button
                  onClick={subscribePremium}
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg shadow-purple-500/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating...
                    </div>
                  ) : (
                    "Subscribe — debit ₹2,000 from wallet"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Wallet className="h-3 w-3" />
              Wallet balance will be checked before any deduction
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Upgrade Prompt */}
      <Dialog open={agentPrompt} onOpenChange={setAgentPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              Become an Agent
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You're now on Premium! 🎉 Upgrade to Agent profile and unlock more benefits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm font-medium text-foreground">Agent benefits include:</p>
            <ul className="space-y-2">
              {[
                "Receive matched buyer leads directly",
                "Build a verified agent profile",
                "Earn XP and rank on leaderboard",
                "Get featured in agent listings",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground/80">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setAgentPrompt(false)}>
              Maybe Later
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
              onClick={() => navigate("/select-profile")}
            >
              Switch to Agent Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
