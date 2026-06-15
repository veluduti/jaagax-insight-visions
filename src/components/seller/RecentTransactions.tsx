import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  RefreshCw,
  History,
  TrendingUp,
  Receipt,
  Crown,
  Download,
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
  userId: string;
  limit?: number;
  showHeader?: boolean;
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

export default function RecentTransactions({ userId, limit = 10, showHeader = true }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
    if (userId) loadTransactions();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
    toast.success("Transactions refreshed");
  };

  const filtered = useMemo(
    () => (categoryFilter === "all" ? transactions : transactions.filter((t) => t.category === categoryFilter)),
    [transactions, categoryFilter],
  );

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [transactions]);

  const exportCSV = () => {
    if (!filtered.length) return toast.error("No transactions to export");
    const rows = [
      ["Date", "Type", "Category", "Description", "Amount (INR)", "Status"],
      ...filtered.map((t) => [
        new Date(t.created_at).toISOString(),
        t.type,
        t.category || "",
        (t.description || "").replace(/"/g, '""'),
        String(t.amount),
        t.status || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
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

  const getAmountColor = (tx: Tx) =>
    tx.type === "credit" ? "text-emerald-500" : "text-rose-500";

  const totalCredits = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDebits = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <History className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
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
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {transactions.length > 0 && (
          <div className="flex gap-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">In:</span>
              <span className="text-sm font-semibold text-emerald-500">
                ₹{totalCredits.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Out:</span>
              <span className="text-sm font-semibold text-rose-500">
                ₹{totalDebits.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
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
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200"
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
      </CardContent>
    </Card>
  );
}
