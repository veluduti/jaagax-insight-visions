import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AddMoneyDialog from "./AddMoneyDialog";
import TransactionHistory from "./TransactionHistory";
import AutoRechargeSettings from "./AutoRechargeSettings";

interface AgentWalletProps {
  userId: string;
}

export default function AgentWallet({ userId }: AgentWalletProps) {
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoRechargeOpen, setAutoRechargeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!userId) return;

    try {
      const sb: any = supabase;

      // Fetch wallet balance
      const { data: w } = await sb.from("wallets").select("*").eq("user_id", userId).maybeSingle();

      if (!w) {
        await sb.from("wallets").insert({ user_id: userId, balance: 0 });
        setBalance(0);
      } else {
        setBalance(Number(w.balance) || 0);
      }

      // Fetch earnings (credits excluding add_money)
      const { data: cb } = await sb
        .from("wallet_transactions")
        .select("amount, type, category")
        .eq("user_id", userId)
        .eq("type", "credit");

      const totalEarn = (cb || [])
        .filter((r: any) => r.category !== "add_money")
        .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      setEarnings(totalEarn);
    } catch (error: any) {
      console.error("Error loading wallet:", error);
      toast.error("Failed to load wallet data");
    }
  };

  useEffect(() => {
    if (!userId) return;
    load();

    // Listen for wallet updates from other components
    const handler = () => load();
    window.addEventListener("walletUpdated", handler);
    return () => window.removeEventListener("walletUpdated", handler);
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Wallet refreshed");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <CardContent className="p-5 relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Wallet
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
                <p className="text-xs text-muted-foreground mt-1">Available for leads, boosts & subscriptions</p>
              </div>
              <Button onClick={() => setAddMoneyOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Money
              </Button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Total Earnings
                </p>
                <p className="text-lg font-bold">{formatCurrency(earnings)}</p>
                <p className="text-[10px] text-muted-foreground">Commissions, bonuses & referrals</p>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-500 opacity-70" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Instant top-up</Badge>
              <Badge variant="outline">Secure payments</Badge>
              <Badge variant="outline">UPI / Cards</Badge>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="text-xs">
                Transaction History
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAutoRechargeOpen(true)} className="text-xs">
                Auto Recharge
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <AddMoneyDialog userId={userId} open={addMoneyOpen} onOpenChange={setAddMoneyOpen} onSuccess={load} />

      <TransactionHistory userId={userId} open={historyOpen} onOpenChange={setHistoryOpen} />

      <AutoRechargeSettings
        userId={userId}
        open={autoRechargeOpen}
        onOpenChange={setAutoRechargeOpen}
        walletBalance={balance}
        onUpdate={load}
      />
    </>
  );
}
