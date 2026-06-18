import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Smartphone, CreditCard, Building2, Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

const QUICK = [500, 1000, 2000, 5000, 10000];
const METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Building2 },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

export function AddMoneyModal({ open, onOpenChange, initialAmount }: { open: boolean; onOpenChange: (o: boolean) => void; initialAmount?: number }) {
  const { addMoney } = useWallet();
  const [amount, setAmount] = useState<number>(initialAmount ?? 1000);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!(amount > 0)) return;
    setBusy(true);
    try {
      await addMoney(amount, { paymentMethod: method, description: `Added via ${method.toUpperCase()}` });
      onOpenChange(false);
    } catch {} finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>Top up your wallet to use across the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK.map(q => (
                <Button key={q} type="button" variant={amount === q ? "default" : "outline"} size="sm" onClick={() => setAmount(q)}>
                  ₹{q.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-2">
              {METHODS.map(m => {
                const Icon = m.icon;
                return (
                  <Label key={m.id} htmlFor={m.id} className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer ${method === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value={m.id} id={m.id} />
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{m.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <Button className="w-full" onClick={submit} disabled={busy || !(amount > 0)}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</> : `Add ₹${(amount || 0).toLocaleString("en-IN")}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Demo gateway — funds credited instantly for testing.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddMoneyModal;
