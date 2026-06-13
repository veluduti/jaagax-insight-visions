import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown,
  Receipt,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Tx {
  id: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface RecentTransactionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  limit?: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "add_money":
      return <TrendingUp className="h-3 w-3" />;
    case "posting_fee":
      return <Receipt className="h-3 w-3" />;
    case "subscription":
      return <Crown className="h-3 w-3" />;
    default:
      return <Wallet className="h-3 w-3" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "add_money":
      return "bg-emerald-500/10 text-emerald-500";
    case "posting_fee":
      return "bg-orange-500/10 text-orange-500";
    case "subscription":
      return "bg-purple-500/10 text-purple-500";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function RecentTransactions({ open, onOpenChange, userId, limit = 50 }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    setTransactions((data || []) as Tx[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && userId) {
      loadTransactions();
    }
  }, [open, userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
    toast.success("Transactions refreshed");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  };

  const formatAmount = (tx: Tx) => {
    const amount = Number(tx.amount).toLocaleString("en-IN");
    return tx.type === "credit" ? `+₹${amount}` : `-₹${amount}`;
  };

  const getAmountColor = (tx: Tx) => {
    return tx.type === "credit" ? "text-emerald-500" : "text-rose-500";
  };

  // Calculate totals
  const totalCredits = transactions.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDebits = transactions.filter((t) => t.type === "debit").reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <History className="h-4 w-4 text-emerald-500" />
              </div>
              <DialogTitle className="text-lg font-semibold">Transaction History</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <DialogDescription>View all your wallet transactions and payment history</DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        {transactions.length > 0 && (
          <div className="flex gap-4 px-1 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total In:</span>
              <span className="text-sm font-semibold text-emerald-500">₹{totalCredits.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Total Out:</span>
              <span className="text-sm font-semibold text-rose-500">₹{totalDebits.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto pr-2 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add money to your wallet to see activity</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg ${getCategoryColor(tx.category)} shrink-0`}>
                        {getCategoryIcon(tx.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.description || (tx.type === "credit" ? "Money Added" : "Payment Made")}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              tx.type === "credit"
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-rose-500/30 text-rose-400"
                            }`}
                          >
                            {tx.type === "credit" ? "Credit" : "Debit"}
                          </Badge>
                          {tx.status === "completed" && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[9px] px-1.5">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${getAmountColor(tx)}`}>{formatAmount(tx)}</p>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
