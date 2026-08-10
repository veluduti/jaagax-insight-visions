import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { startWalletTopUp } from "@/lib/razorpayCheckout";
import { toast } from "sonner";
import { CalendarCheck, Check, Crown, Gift, Loader2, Wallet } from "lucide-react";
import type { VisitEntitlement } from "@/hooks/useVisitEntitlement";
import { fetchPostingEntitlement, type PostingEntitlement } from "@/hooks/usePostingEntitlement";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entitlement: VisitEntitlement | null;
  userId: string | null;
  userInfo?: { name?: string | null; email?: string | null; contact?: string | null };
  /** Called once the visit is covered / paid for — should create the booking. */
  onProceed: () => void;
}

type Choice = "free" | "paid" | "agent";

export default function VisitPaymentDialog({
  open,
  onOpenChange,
  entitlement,
  userId,
  userInfo,
  onProceed,
}: Props) {
  const [wallet, setWallet] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [posting, setPosting] = useState<PostingEntitlement | null>(null);
  const [busy, setBusy] = useState<Choice | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const [{ data: w }, { data: cfg }, pe] = await Promise.all([
        (supabase as any).from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("platform_pricing_settings").select("*").limit(1).maybeSingle(),
        fetchPostingEntitlement(userId),
      ]);
      setWallet(Number(w?.balance || 0));
      setSettings(cfg);
      setPosting(pe);
    })();
  }, [open, userId]);

  const freeRemaining = entitlement?.free_remaining ?? 0;
  const visitTotal = Number(entitlement?.total || 0);
  const paidEnabled = entitlement?.paid_enabled !== false && visitTotal > 0;

  const agentPrice = Number(settings?.agent_subscription_price || 0);
  const agentGstPct = Number(settings?.agent_subscription_gst_percent || 0);
  const agentTotal = agentPrice + Math.round(agentPrice * agentGstPct) / 100;
  const agentCycle = settings?.agent_billing_cycle || "monthly";
  const agentEnabled = settings?.agent_subscription_enabled !== false && agentTotal > 0;
  const isAgent = !!posting?.is_agent;
  const hasAgentSub = !!posting?.has_agent_subscription;
  const trialActive = !!posting?.trial_active;

  const ensureBalance = async (amount: number) => {
    if (wallet >= amount) return true;
    const shortfall = Math.max(Math.ceil(amount - wallet), 500);
    toast.info(`Opening secure payment for ${inr(shortfall)}`);
    const res = await startWalletTopUp(shortfall, userInfo);
    setWallet(Number(res.new_balance || wallet + shortfall));
    window.dispatchEvent(new Event("walletUpdated"));
    return true;
  };

  const handleFree = () => {
    onOpenChange(false);
    onProceed();
  };

  const handlePaid = async () => {
    setBusy("paid");
    try {
      await ensureBalance(visitTotal);
      onOpenChange(false);
      onProceed(); // booking flow debits the wallet + issues the invoice
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const handleAgentSubscription = async () => {
    if (!userId) return;
    if (!isAgent) {
      onOpenChange(false);
      navigate("/agent/register");
      return;
    }
    if (trialActive || hasAgentSub) {
      onOpenChange(false);
      onProceed();
      return;
    }
    setBusy("agent");
    try {
      await ensureBalance(agentTotal);
      const { data, error } = await (supabase as any).rpc("purchase_agent_subscription", {
        _user_id: userId,
      });
      if (error) throw error;
      if (!data?.ok)
        throw new Error(data?.reason === "insufficient_funds" ? "Insufficient balance" : "Subscription failed");
      toast.success("Agent subscription activated", { description: `Invoice ${data.invoice_number}` });
      window.dispatchEvent(new Event("walletUpdated"));
      onOpenChange(false);
      onProceed();
    } catch (e: any) {
      toast.error(e?.message || "Subscription failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (busy ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose how to schedule this visit</DialogTitle>
          <DialogDescription>
            Wallet balance: <strong className="text-foreground">{inr(wallet)}</strong> — payments are processed
            securely via Razorpay.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          {/* 1. Free allowance — agents see their admin-configured agent trial */}
          {isAgent ? (
            <div
              className={`rounded-2xl border p-4 flex flex-col ${
                trialActive ? "border-emerald-500/40 bg-emerald-500/5" : "border-border opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-sm">Agent Free Trial</span>
              </div>
              <div className="text-2xl font-bold">Free</div>
              <p className="text-xs text-muted-foreground mt-1 flex-1">
                {trialActive
                  ? `${posting?.trial_days_remaining ?? 0} days left in your agent trial (set by admin) — visits are free.`
                  : "Your agent trial has ended. Continue with the subscription plan."}
              </p>
              <Button className="mt-3 w-full" disabled={!trialActive || busy !== null} onClick={handleFree}>
                {trialActive ? "Book free visit" : "Trial ended"}
              </Button>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-4 flex flex-col ${
                freeRemaining > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-sm">Free Visit Schedules</span>
              </div>
              <div className="text-2xl font-bold">Free</div>
              <p className="text-xs text-muted-foreground mt-1 flex-1">
                {freeRemaining > 0
                  ? `${freeRemaining} of ${entitlement?.free_limit ?? 0} free visit bookings left on your account.`
                  : `All ${entitlement?.free_limit ?? 0} free visit bookings used.`}
              </p>
              <Button className="mt-3 w-full" disabled={freeRemaining <= 0 || busy !== null} onClick={handleFree}>
                {freeRemaining > 0 ? "Book free visit" : "Not available"}
              </Button>
            </div>
          )}

          {/* 2. Agents → subscription. Customers → paid visit booking. */}
          {isAgent ? (
            <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-sm">Agent Subscription</span>
                </div>
                {hasAgentSub && <Badge className="bg-green-600">Active</Badge>}
              </div>
              <div className="text-2xl font-bold">
                {inr(agentTotal)}
                <span className="text-xs font-normal text-muted-foreground">/{agentCycle}</span>
              </div>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1 flex-1">
                {["Unlimited visit schedules", "Priority agent slots", "No per-visit charges"].map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600" /> {b}
                  </li>
                ))}
              </ul>
              {trialActive && (
                <p className="text-[11px] text-emerald-600 mt-1">Starts automatically once your free trial ends.</p>
              )}
              {!trialActive && !hasAgentSub && (
                <p className="text-[11px] text-yellow-600 mt-1">Trial complete — subscribe to keep booking visits.</p>
              )}
              <Button
                variant="outline"
                className="mt-3 w-full border-yellow-500/60"
                disabled={busy !== null || (!agentEnabled && !hasAgentSub && !trialActive)}
                onClick={handleAgentSubscription}
              >
                {busy === "agent" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {trialActive
                  ? "Book (free trial)"
                  : hasAgentSub
                  ? "Book (subscribed)"
                  : agentEnabled
                  ? "Subscribe & book"
                  : "Unavailable"}
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Visit Booking</span>
              </div>
              <div className="text-2xl font-bold">{inr(visitTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex-1">
                One-time charge for this visit — {inr(entitlement?.fee ?? 0)} + {entitlement?.gst_percent ?? 0}% GST.
                {wallet < visitTotal ? " Pay via Razorpay." : " Debited from your wallet."}
              </p>
              <Button className="mt-3 w-full gap-2" disabled={busy !== null || !paidEnabled} onClick={handlePaid}>
                {busy === "paid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {!paidEnabled ? "Unavailable" : wallet >= visitTotal ? `Pay ${inr(visitTotal)}` : "Pay with Razorpay"}
              </Button>
            </div>
          )}
        </div>


        <p className="text-[11px] text-muted-foreground text-center">
          Free visit allowance, visit fee and GST are configured by the admin.
        </p>
      </DialogContent>
    </Dialog>
  );
}
