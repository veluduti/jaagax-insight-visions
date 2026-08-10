import { useEffect, useState } from "react";
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
import { Check, Crown, Gift, Loader2, Wallet } from "lucide-react";
import type { PostingEntitlement } from "@/hooks/usePostingEntitlement";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entitlement: PostingEntitlement | null;
  userId: string | null;
  userInfo?: { name?: string | null; email?: string | null; contact?: string | null };
  /** Called once the listing is paid for / covered — should perform the actual publish. */
  onProceed: () => void;
  onEntitlementChanged?: () => void;
}

type Choice = "free" | "post" | "agent";

export default function PublishPaymentDialog({
  open,
  onOpenChange,
  entitlement,
  userId,
  userInfo,
  onProceed,
  onEntitlementChanged,
}: Props) {
  const [wallet, setWallet] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState<Choice | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const [{ data: w }, { data: cfg }] = await Promise.all([
        (supabase as any).from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("platform_pricing_settings").select("*").limit(1).maybeSingle(),
      ]);
      setWallet(Number(w?.balance || 0));
      setSettings(cfg);
    })();
  }, [open, userId]);

  const freeRemaining = entitlement?.free_remaining ?? 0;
  const postTotal = Number(entitlement?.total || 0);

  const agentPrice = Number(settings?.agent_subscription_price || 0);
  const agentGstPct = Number(settings?.agent_subscription_gst_percent || 0);
  const agentTotal = agentPrice + Math.round(agentPrice * agentGstPct) / 100;
  const agentCycle = settings?.agent_billing_cycle || "monthly";
  const agentEnabled = settings?.agent_subscription_enabled !== false && agentTotal > 0;
  const hasAgentSub = !!entitlement?.has_agent_subscription;

  /** Ensures wallet has at least `amount`; tops up via Razorpay otherwise. */
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

  const handlePayPerPost = async () => {
    setBusy("post");
    try {
      await ensureBalance(postTotal);
      onOpenChange(false);
      onProceed(); // publish flow debits the wallet + issues invoice
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const handleAgentSubscription = async () => {
    if (!userId) return;
    setBusy("agent");
    try {
      if (!hasAgentSub) {
        await ensureBalance(agentTotal);
        const { data, error } = await (supabase as any).rpc("purchase_agent_subscription", {
          _user_id: userId,
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.reason === "insufficient_funds" ? "Insufficient balance" : "Subscription failed");
        toast.success("Agent subscription activated", { description: `Invoice ${data.invoice_number}` });
        window.dispatchEvent(new Event("walletUpdated"));
        onEntitlementChanged?.();
      }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose how to publish this listing</DialogTitle>
          <DialogDescription>
            Wallet balance: <strong className="text-foreground">{inr(wallet)}</strong> — payments are processed
            securely via Razorpay.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          {/* 1. Free trial */}
          <div
            className={`rounded-2xl border p-4 flex flex-col ${
              freeRemaining > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border opacity-70"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-sm">Free Trial</span>
            </div>
            <div className="text-2xl font-bold">Free</div>
            <p className="text-xs text-muted-foreground mt-1 flex-1">
              {freeRemaining > 0
                ? `${freeRemaining} of ${entitlement?.free_limit ?? 0} free posts left this month.`
                : `All ${entitlement?.free_limit ?? 0} free posts used this month.`}
            </p>
            <Button className="mt-3 w-full" disabled={freeRemaining <= 0 || busy !== null} onClick={handleFree}>
              {freeRemaining > 0 ? "Publish free" : "Not available"}
            </Button>
          </div>

          {/* 2. Customer property posting */}
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Property Posting</span>
            </div>
            <div className="text-2xl font-bold">{inr(postTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex-1">
              One-time charge for this listing — {inr(entitlement?.fee ?? 0)} + {entitlement?.gst_percent ?? 0}% GST.
              {wallet < postTotal ? " Pay via Razorpay." : " Debited from your wallet."}
            </p>
            <Button
              className="mt-3 w-full"
              disabled={busy !== null || postTotal <= 0}
              onClick={handlePayPerPost}
            >
              {busy === "post" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {wallet >= postTotal ? `Pay ${inr(postTotal)}` : `Pay with Razorpay`}
            </Button>
          </div>

          {/* 3. Agent subscription */}
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
              {["Unlimited listings", "Premium visibility", "Priority leads"].map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-600" /> {b}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-3 w-full border-yellow-500/60"
              disabled={busy !== null || (!agentEnabled && !hasAgentSub)}
              onClick={handleAgentSubscription}
            >
              {busy === "agent" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {hasAgentSub ? "Publish (subscribed)" : agentEnabled ? "Subscribe & publish" : "Unavailable"}
            </Button>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Payments are collected through Razorpay and credited to your JAAGA X wallet, then applied to this listing
          with a GST invoice.
        </div>
      </DialogContent>
    </Dialog>
  );
}
