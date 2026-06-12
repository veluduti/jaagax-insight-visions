import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Tx {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  status: string;
  created_at: string;
}

const PRESETS = [500, 1000, 2000, 5000];

export default function WalletBalance({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const sb: any = supabase;
    const { data: w } = await sb.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    if (!w) {
      await sb.from("wallets").insert({ user_id: userId, balance: 0 });
      setBalance(0);
    } else {
      setBalance(Number(w.balance) || 0);
      setAutoRecharge(!!w.auto_recharge);
    }
    const { data: t } = await sb
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    setTxs((t || []) as Tx[]);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const handleAdd = async () => {
    if (amount < 100) return toast.error("Minimum top-up is ₹100");
    setLoading(true);
    const sb: any = supabase;
    const { error } = await sb.rpc("increment_wallet_balance", {
      _user_id: userId,
      _amount: amount,
      _description: `Wallet top-up (mock)`,
      _reference: `mock:${Date.now()}`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`₹${amount} added to wallet`);
    setOpen(false);
    load();
  };

  const toggleAuto = async (v: boolean) => {
    setAutoRecharge(v);
    const sb: any = supabase;
    await sb.from("wallets").update({ auto_recharge: v }).eq("user_id", userId);
    toast.success(`Auto-recharge ${v ? "enabled" : "disabled"}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-background">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <CardContent className="p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium uppercase tracking-wider">
              <Wallet className="h-4 w-4" /> Wallet Balance
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Instant
            </Badge>
          </div>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">
                ₹{balance.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Available for boosts, postings, premium</p>
            </div>
            <Button
              onClick={() => setOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Money
            </Button>
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 border border-border/50 mb-3">
            <div className="text-xs">
              <p className="font-medium">Auto-recharge</p>
              <p className="text-muted-foreground">Add ₹1,000 when balance drops below ₹500</p>
            </div>
            <Switch checked={autoRecharge} onCheckedChange={toggleAuto} />
          </div>

          {txs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Recent</p>
              {txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.type === "credit" ? (
                      <ArrowDownRight className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 text-rose-500 shrink-0" />
                    )}
                    <span className="truncate">{t.description || t.type}</span>
                  </div>
                  <span className={t.type === "credit" ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                    {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add money to wallet</DialogTitle>
            <DialogDescription>Choose a quick amount or enter your own. Minimum ₹100.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                variant={amount === p ? "default" : "outline"}
                onClick={() => setAmount(p)}
                className={amount === p ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
              >
                ₹{p.toLocaleString("en-IN")}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            min={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            placeholder="Custom amount"
          />
          <p className="text-xs text-muted-foreground">
            Demo mode: balance updates instantly. Razorpay/PhonePe will be wired in a later phase.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading ? "Adding…" : `Add ₹${amount.toLocaleString("en-IN")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
