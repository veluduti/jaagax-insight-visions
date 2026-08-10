import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { startWalletTopUp } from "@/lib/razorpayCheckout";
import { toast } from "sonner";
import { CalendarCheck, Gift, Loader2, Wallet } from "lucide-react";
import type { VisitEntitlement } from "@/hooks/useVisitEntitlement";

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

type Choice = "free" | "paid";

export default function VisitPaymentDialog({
  open,
  onOpenChange,
  entitlement,
  userId,
  userInfo,
  onProceed,
}: Props) {
  const [wallet, setWallet] = useState(0);
  const [busy, setBusy] = useState<Choice | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const { data: w } = await (supabase as any)
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      setWallet(Number(w?.balance || 0));
    })();
  }, [open, userId]);

  const freeRemaining = entitlement?.free_remaining ?? 0;
  const visitTotal = Number(entitlement?.total || 0);
  const paidEnabled = entitlement?.paid_enabled !== false && visitTotal > 0;

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
          {/* 1. Free visit schedules (admin configured) */}
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

          {/* 2. Paid visit booking */}
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
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Free visit allowance, visit fee and GST are configured by the admin.
        </p>
      </DialogContent>
    </Dialog>
  );
}
