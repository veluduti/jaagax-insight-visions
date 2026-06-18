import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, MessageSquare, Loader2 } from "lucide-react";
import { useFinancial, LoanType } from "@/hooks/useFinancial";
import { toast } from "sonner";

export function EMIDiscussion() {
  const { createEnquiry } = useFinancial();
  const [amount, setAmount] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [busy, setBusy] = useState(false);

  const monthly = (amount * (rate / 1200) * Math.pow(1 + rate / 1200, tenure * 12)) /
    (Math.pow(1 + rate / 1200, tenure * 12) - 1);
  const total = monthly * tenure * 12;
  const interest = total - amount;

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  const discuss = async () => {
    setBusy(true);
    try {
      await createEnquiry({
        loan_type: "home_loan" as LoanType,
        amount_requested: amount,
        loan_tenure_years: tenure,
        interest_rate_offered: rate,
        monthly_emi: Math.round(monthly),
        notes: "EMI discussion requested",
      });
      toast.success("A financial advisor will contact you shortly.");
    } catch (e: any) {
      toast.error(e.message || "Could not create enquiry");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">EMI Calculator & Discussion</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Loan Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <Slider value={[amount]} onValueChange={(v) => setAmount(v[0])} min={100000} max={50000000} step={100000} />
          </div>
          <div className="space-y-2">
            <Label>Interest Rate (%)</Label>
            <Input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            <Slider value={[rate]} onValueChange={(v) => setRate(v[0])} min={6} max={15} step={0.1} />
          </div>
          <div className="space-y-2">
            <Label>Tenure (yrs)</Label>
            <Input type="number" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
            <Slider value={[tenure]} onValueChange={(v) => setTenure(v[0])} min={1} max={30} step={1} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-primary/5 rounded">
            <div className="text-xs text-muted-foreground">Monthly EMI</div>
            <div className="font-bold text-lg text-primary">{fmt(monthly)}</div>
          </div>
          <div className="p-3 bg-muted/40 rounded">
            <div className="text-xs text-muted-foreground">Total Interest</div>
            <div className="font-bold text-lg">{fmt(interest)}</div>
          </div>
          <div className="p-3 bg-muted/40 rounded">
            <div className="text-xs text-muted-foreground">Total Payment</div>
            <div className="font-bold text-lg">{fmt(total)}</div>
          </div>
        </div>

        <Button onClick={discuss} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
          Discuss with Financial Advisor
        </Button>
      </CardContent>
    </Card>
  );
}

export default EMIDiscussion;
