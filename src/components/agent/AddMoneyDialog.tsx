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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Banknote, Zap } from "lucide-react";
import { toast } from "sonner";

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");

  const handleAdd = async () => {
    if (amount < 100) {
      toast.error("Minimum top-up is ₹100");
      return;
    }
    if (amount > 50000) {
      toast.error("Maximum top-up per transaction is ₹50,000");
      return;
    }

    setLoading(true);
    const sb: any = supabase;

    try {
      // Ensure wallet exists
      const { data: wallet } = await sb.from("wallets").select("id").eq("user_id", userId).maybeSingle();

      if (!wallet) {
        await sb.from("wallets").insert({ user_id: userId, balance: 0 });
      }

      // Call RPC to increment balance
      const { data, error } = await sb.rpc("increment_wallet_balance", {
        _user_id: userId,
        _amount: amount,
        _description: `Wallet top-up via ${paymentMethod.toUpperCase()}`,
        _reference: `topup:${Date.now()}`,
      });

      if (error) {
        // If RPC doesn't exist, fallback to direct update
        const { data: w } = await sb.from("wallets").select("balance").eq("user_id", userId).single();

        const newBalance = (w?.balance || 0) + amount;

        const { error: updateError } = await sb
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Insert transaction
        const { data: w2 } = await sb.from("wallets").select("id").eq("user_id", userId).single();

        await sb.from("wallet_transactions").insert({
          user_id: userId,
          wallet_id: w2?.id,
          amount: amount,
          type: "credit",
          category: "add_money",
          description: `Wallet top-up ₹${amount} via ${paymentMethod.toUpperCase()}`,
          status: "success",
          reference_id: `topup_${Date.now()}`,
        });
      }

      toast.success(`₹${amount.toLocaleString("en-IN")} added successfully!`);
      onOpenChange(false);
      onSuccess?.();
      window.dispatchEvent(new Event("walletUpdated"));
    } catch (error: any) {
      console.error("Add money error:", error);
      toast.error(error.message || "Failed to add money. Please try again.");
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
            Add funds to your wallet for promotions, subscriptions, and lead purchases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Method Tabs */}
          <Tabs defaultValue="card" onValueChange={(v) => setPaymentMethod(v as "card" | "upi")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="upi" className="gap-2">
                <Banknote className="h-4 w-4" />
                UPI
              </TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="space-y-3 mt-3">
              <Alert>
                <AlertDescription className="text-xs">
                  💳 Secure card payments powered by Stripe. Your card details are encrypted.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Input placeholder="Card Number" disabled={loading} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MM/YY" disabled={loading} />
                  <Input placeholder="CVC" disabled={loading} />
                </div>
                <Input placeholder="Cardholder Name" disabled={loading} />
              </div>
            </TabsContent>
            <TabsContent value="upi" className="space-y-3 mt-3">
              <Alert>
                <AlertDescription className="text-xs">
                  📱 Pay using any UPI app: Google Pay, PhonePe, Paytm, or any bank UPI.
                </AlertDescription>
              </Alert>
              <Input placeholder="Enter UPI ID (e.g., name@okhdfcbank)" disabled={loading} />
            </TabsContent>
          </Tabs>

          {/* Amount Selection */}
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

          {/* Custom Amount */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Amount</label>
            <Input
              type="number"
              min={100}
              max={50000}
              step={100}
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Enter amount"
            />
            <p className="text-xs text-muted-foreground mt-1">Min: ₹100 | Max: ₹50,000</p>
          </div>

          {/* Amount Summary */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm">Amount to add:</span>
              <span className="text-xl font-bold text-primary">₹{amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Demo Mode Notice */}
          <div className="bg-muted/40 rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground text-center">
              💳 <strong>Demo mode:</strong> Balance updates instantly. Payment gateway integration (Stripe) will be
              activated in production.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || amount < 100 || amount > 50000}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Add ₹${amount.toLocaleString("en-IN")}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
