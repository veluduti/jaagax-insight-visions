import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { startWalletTopUp } from "@/lib/razorpayCheckout";

const PRESETS = [500, 1000, 2000, 5000, 10000];

interface AddMoneyDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddMoneyDialog({ userId, open, onOpenChange, onSuccess }: AddMoneyDialogProps) {
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [user, setUser] = useState<{ name?: string; email?: string; contact?: string }>({});

  useEffect(() => {
    if (!open) return;
    const sb: any = supabase;
    sb.from("wallets").select("balance").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => setBalance(Number(data?.balance ?? 0)));
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser({
        name: (u?.user_metadata as any)?.full_name || (u?.user_metadata as any)?.name,
        email: u?.email ?? undefined,
        contact: u?.phone || (u?.user_metadata as any)?.phone,
      });
    });
  }, [open, userId]);

  const handleAdd = async () => {
    if (amount < 500) {
      toast.error("Minimum top-up is ₹500");
      return;
    }
    setLoading(true);
    try {
      const res = await startWalletTopUp(amount, user);
      toast.success(`₹${res.amount.toLocaleString("en-IN")} added successfully!`);
      onOpenChange(false);
      onSuccess?.();
      window.dispatchEvent(new Event("walletUpdated"));
    } catch (error: any) {
      const msg = error?.message || "Failed to add money. Please try again.";
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Add Money to Wallet
          </DialogTitle>
          <DialogDescription>
            Secure top-up powered by Razorpay — UPI, Cards, Net Banking &amp; Wallets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 border p-3">
            <span className="text-sm text-muted-foreground">Current balance</span>
            <span className="text-lg font-semibold">₹{balance.toLocaleString("en-IN")}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Amount (₹)</label>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant={amount === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(p)}
                  className="text-sm"
                >
                  ₹{p.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Amount</label>
            <Input
              type="number"
              min={500}
              step={100}
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Enter amount"
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum ₹500</p>
          </div>

          <div className="rounded-lg border p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5" />
            <span>Balance is credited only after Razorpay verifies your payment.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || amount < 500}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₹${amount.toLocaleString("en-IN")}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
