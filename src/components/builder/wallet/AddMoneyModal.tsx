import { useState } from "react";
import { Loader2, Wallet as WalletIcon, CreditCard } from "lucide-react";
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
import { walletService, formatCurrency } from "@/services/walletService";

interface AddMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newBalance: number) => void;
}

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

export default function AddMoneyModal({ open, onOpenChange, onSuccess }: AddMoneyModalProps) {
  const [amount, setAmount] = useState<string>("1000");
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount || 0);
  const isValid = Number.isFinite(numericAmount) && numericAmount >= 100;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Invalid amount", {
        description: "Minimum top-up is ₹100.",
      });
      return;
    }

    setLoading(true);
    try {
      const newBalance = await walletService.addMoney({
        amount: numericAmount,
        description: `Wallet top-up via ${method.toUpperCase()}`,
        reference: `${method}_${Date.now()}`,
      });

      toast.success("Money added", {
        description: `${formatCurrency(numericAmount)} credited. New balance: ${formatCurrency(newBalance)}.`,
      });
      onSuccess?.(newBalance);
      onOpenChange(false);
      setAmount("1000");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add money";
      toast.error("Top-up failed", { description: message });
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
            Top-up your wallet to run promotions, purchase leads, and unlock premium boosts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label htmlFor="amount" className="text-slate-300">
              Amount (₹)
            </Label>
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

          <div>
            <Label className="text-slate-300">Payment method</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["upi", "card", "netbanking"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs uppercase tracking-wide transition ${
                    method === m
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-800/50 p-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Top-up amount</span>
              <span>{formatCurrency(numericAmount || 0)}</span>
            </div>
            <div className="mt-1 flex justify-between text-slate-400">
              <span>GST (18%)</span>
              <span>{formatCurrency(Math.round(numericAmount * 0.18))}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 font-semibold text-slate-100">
              <span>Total payable</span>
              <span>{formatCurrency(Math.round(numericAmount * 1.18))}</span>
            </div>
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
              `Pay ${formatCurrency(Math.round(numericAmount * 1.18))}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
