import { useEffect, useState } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Plus, Wallet as WalletIcon } from "lucide-react";

export default function FinancialWallet() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [threshold, setThreshold] = useState(500);
  const [rechargeAmt, setRechargeAmt] = useState(2000);
  const [addOpen, setAddOpen] = useState(false);
  const [addAmt, setAddAmt] = useState(1000);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const [{ data: w }, { data: t }] = await Promise.all([
      (supabase as any).from("wallets").select("*").eq("user_id", u.user.id).maybeSingle(),
      (supabase as any).from("wallet_transactions").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (w) {
      setBalance(Number(w.balance));
      setAutoRecharge(!!w.auto_recharge);
      setThreshold(Number(w.auto_recharge_threshold ?? 500));
      setRechargeAmt(Number(w.auto_recharge_amount ?? 1000));
    }
    setTxns(t ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addFunds() {
    if (!userId || addAmt <= 0) return;
    // mock payment
    const { error } = await (supabase as any).rpc("increment_wallet_balance",
      { _user_id: userId, _amount: addAmt, _description: "Wallet top-up (mock Razorpay)", _reference: `razorpay_mock_${Date.now()}` });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ₹${addAmt}`); setAddOpen(false); load();
  }

  async function saveAuto() {
    if (!userId) return;
    const { error } = await (supabase as any).from("wallets").update({
      auto_recharge: autoRecharge, auto_recharge_threshold: threshold, auto_recharge_amount: rechargeAmt,
    }).eq("user_id", userId);
    if (error) toast.error(error.message); else toast.success("Auto recharge settings saved");
  }

  return (
    <FinancialLayout title="Wallet" subtitle="Top up to purchase leads & promotions">
      <Card className="border-border bg-gradient-to-br from-amber-950/40 via-yellow-900/20 to-black backdrop-blur-md">
        <CardContent className="py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary/70">Current Balance</p>
            <p className="text-5xl font-bold bg-gradient-to-r from-primary to-primary ">
              ₹{balance.toLocaleString("en-IN")}
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg" className="bg-primary text-primary-foreground font-semibold">
            <Plus className="h-5 w-5 mr-2" />Add Funds
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border bg-card backdrop-blur-md">
          <CardHeader><CardTitle className="text-primary text-base">Auto Recharge</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable auto recharge</span>
              <Switch checked={autoRecharge} onCheckedChange={setAutoRecharge} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Low balance threshold (₹)</p>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="bg-card border-border" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recharge amount (₹)</p>
              <Input type="number" value={rechargeAmt} onChange={(e) => setRechargeAmt(Number(e.target.value))} className="bg-card border-border" />
            </div>
            <Button onClick={saveAuto} className="w-full bg-primary text-primary-foreground">Save Settings</Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card backdrop-blur-md">
          <CardHeader><CardTitle className="text-primary text-base">Lead & Promotion Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Buyer Lead", "₹99"], ["Investor Lead", "₹199"],
              ["Agent / Builder Referral", "₹199"], ["Hotel Financing Lead", "₹199"],
              ["Homepage Featured", "₹299/day"], ["Top Search Placement", "₹499/day"],
              ["Preferred Partner", "₹2,999/mo"], ["Premium Badge", "₹1,999/mo"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border py-1.5">
                <span className="text-foreground">{k}</span><span className="text-primary font-semibold">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card backdrop-blur-md">
        <CardHeader><CardTitle className="text-primary text-base flex items-center gap-2"><WalletIcon className="h-4 w-4" />Transaction History</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-primary">Date</TableHead>
                <TableHead className="text-primary">Description</TableHead>
                <TableHead className="text-primary text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
              ) : txns.map((t) => (
                <TableRow key={t.id} className="border-border">
                  <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className={`text-right font-semibold ${t.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                    {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-primary">Add Funds (Razorpay Test)</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((v) => (
                <Button key={v} variant={addAmt === v ? "default" : "outline"}
                  className={addAmt === v ? "bg-primary text-primary-foreground" : "border-border"}
                  onClick={() => setAddAmt(v)}>₹{v}</Button>
              ))}
            </div>
            <Input type="number" value={addAmt} onChange={(e) => setAddAmt(Number(e.target.value))}
              className="bg-card border-border" placeholder="Custom amount" />
            <Button onClick={addFunds} className="w-full bg-primary text-primary-foreground">
              <CreditCard className="h-4 w-4 mr-2" />Pay ₹{addAmt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FinancialLayout>
  );
}
