import { useState } from "react";
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
import { toast } from "sonner";

const PRESETS = [500, 1000, 2000, 5000];

interface AddMoneyDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddMoneyDialog({ userId, open, onOpenChange, onSuccess }: AddMoneyDialogProps) {
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (amount < 100) return toast.error("Minimum top-up is ₹100");
    setLoading(true);
    const sb: any = supabase;

    const { data: wallet } = await sb
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet) {
      await sb.from("wallets").insert({ user_id: userId, balance: 0 });
    }

    const { error } = await sb.rpc("increment_wallet_balance", {
      _user_id: userId,
      _amount: amount,
      _description: `Wallet top-up`,
      _reference: `topup:${Date.now()}`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { data: w2 } = await sb.from("wallets").select("id").eq("user_id", userId).single();
    await sb.from("wallet_transactions").insert({
      user_id: userId,
      wallet_id: w2?.id,
      amount,
      type: "credit",
      category: "add_money",
      description: `Wallet top-up ₹${amount}`,
      status: "completed",
    });

    toast.success(`₹${amount} added to wallet`);
    setLoading(false);
    onOpenChange(false);
    onSuccess?.();
    window.dispatchEvent(new Event("walletUpdated"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>Choose an amount or enter your own. Minimum ₹100.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                variant={amount === p ? "default" : "outline"}
                onClick={() => setAmount(p)}
              >
                ₹{p.toLocaleString("en-IN")}
              </Button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Amount</label>
            <Input
              type="number"
              min={100}
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Enter amount"
            />
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground text-center">
            💳 Demo mode: Balance updates instantly. Payment gateway coming soon.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={loading || amount < 100}>
            {loading ? "Processing..." : `Add ₹${amount.toLocaleString("en-IN")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
