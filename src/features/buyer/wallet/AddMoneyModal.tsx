import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet as WalletIcon, Loader2, ShieldCheck } from "lucide-react";
import { useWallet, formatINR } from "@/contexts/WalletContext";
import { startWalletTopUp } from "@/lib/razorpayCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUICK = [100, 500, 1000, 2000];

export function AddMoneyModal({
  open,
  onOpenChange,
  initialAmount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialAmount?: number;
}) {
  const { balance, refreshWallet } = useWallet();
  const [amount, setAmount] = useState<number>(initialAmount ?? 500);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; contact?: string }>({});

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser({
        name: (u?.user_metadata as any)?.full_name || (u?.user_metadata as any)?.name,
        email: u?.email ?? undefined,
        contact: u?.phone || (u?.user_metadata as any)?.phone,
      });
    });
  }, [open]);

  const valid = amount >= 100;

  const submit = async () => {
    if (!valid) {
      toast.error("Minimum top-up is ₹100");
      return;
    }
    setBusy(true);
    try {
      const res = await startWalletTopUp(amount, user);
      toast.success(`₹${res.amount.toLocaleString("en-IN")} credited to wallet`);
      await refreshWallet();
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message || "Payment failed";
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-primary" />
            Add Money to Wallet
          </DialogTitle>
          <DialogDescription>Secure top-up powered by Razorpay.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="text-lg font-semibold">{formatINR(balance)}</span>
          </div>

          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              min={100}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Enter amount"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant={amount === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(q)}
                >
                  ₹{q.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Minimum ₹100</p>
          </div>

          <div className="rounded-md border p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5" />
            <span>
              You'll be redirected to Razorpay Checkout. UPI, Cards, Net Banking &amp; Wallets are supported. Your
              balance is credited only after successful payment verification.
            </span>
          </div>

          <Button className="w-full" onClick={submit} disabled={busy || !valid}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
              </>
            ) : (
              `Continue to Pay ₹${(amount || 0).toLocaleString("en-IN")}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddMoneyModal;
