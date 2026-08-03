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
