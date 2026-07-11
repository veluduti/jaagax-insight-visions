import { useEffect, useState } from "react";
import { Loader2, Wallet as WalletIcon, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency, walletService } from "@/services/walletService";
import { startWalletTopUp } from "@/lib/razorpayCheckout";
import { supabase } from "@/integrations/supabase/client";

interface AddMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newBalance: number) => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

export default function AddMoneyModal({ open, onOpenChange, onSuccess }: AddMoneyModalProps) {
  const [amount, setAmount] = useState<string>("1000");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; contact?: string }>({});

  const numericAmount = Number(amount || 0);
  const isValid = Number.isFinite(numericAmount) && numericAmount >= 100;

  useEffect(() => {
    if (!open) return;
    walletService.getWalletBalance().then(setBalance).catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser({
        name: (u?.user_metadata as any)?.full_name || (u?.user_metadata as any)?.name,
        email: u?.email ?? undefined,
        contact: u?.phone || (u?.user_metadata as any)?.phone,
      });
    });
  }, [open]);

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Invalid amount", { description: "Minimum top-up is ₹100." });
      return;
    }
    setLoading(true);
    try {
      const res = await startWalletTopUp(numericAmount, user);
      toast.success("Money added", {
        description: `${formatCurrency(res.amount)} credited. New balance: ${formatCurrency(res.new_balance)}.`,
      });
      onSuccess?.(res.new_balance);
      onOpenChange(false);
      setAmount("1000");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add money";
      if (message !== "Payment cancelled") toast.error("Top-up failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-emerald-400" />
            Add money to wallet
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Secure top-up powered by Razorpay. Balance is credited after payment verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/50 p-3">
            <span className="text-sm text-slate-400">Current balance</span>
            <span className="text-lg font-semibold text-emerald-300">{formatCurrency(balance)}</span>
          </div>

          <div>
            <Label htmlFor="amount" className="text-slate-300">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">Minimum ₹100</p>
          </div>

          <div>
            <Label className="text-slate-300">Quick select</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`rounded-md border px-2 py-2 text-sm transition ${
                    Number(amount) === q
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {formatCurrency(q)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-800/50 p-3 text-xs text-slate-400 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5" />
            <span>UPI, Cards, Net Banking &amp; Wallets accepted via Razorpay Checkout.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Continue to Pay ${formatCurrency(numericAmount)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
