import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Filter,
  RefreshCw,
  ChevronDown,
  Receipt,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Tx {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  status: string;
  category?: string | null;
  created_at: string;
}

type FilterType = "all" | "credit" | "debit";

interface RecentTransactionsProps {
  userId: string;
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export default function RecentTransactions({
  userId,
  limit = 10,
  showHeader = true,
  className = "",
}: RecentTransactionsProps) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [displayLimit, setDisplayLimit] = useState(limit);

  const load = async () => {
    const sb: any = supabase;
    const { data, error } = await sb
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load transactions");
      console.error(error);
      return;
    }

    const rows = (data || []) as Tx[];
    setTxs(rows);
    applyFilter(rows, filter);
    setLoading(false);
  };

  const applyFilter = (rows: Tx[], f: FilterType) => {
    if (f === "all") {
      setFilteredTxs(rows);
    } else {
      setFilteredTxs(rows.filter((tx) => tx.type === f));
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      load();
    }
  }, [userId]);

  useEffect(() => {
    applyFilter(txs, filter);
    setDisplayLimit(limit);
  }, [filter, txs, limit]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Transactions refreshed");
  };

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + limit);
  };

  const formatAmount = (tx: Tx) => {
    const amount = Number(tx.amount).toLocaleString("en-IN");
    return tx.type === "credit" ? `+₹${amount}` : `-₹${amount}`;
  };

  const getIcon = (tx: Tx) => {
    if (tx.type === "credit") {
      return (
        <div className="p-2 rounded-full bg-emerald-500/10">
          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-full bg-rose-500/10">
        <ArrowUpRight className="h-4 w-4 text-rose-500" />
      </div>
    );
  };

  const getAmountColor = (tx: Tx) => {
    return tx.type === "credit" ? "text-emerald-500" : "text-rose-500";
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[10px]">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground text-[10px]">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  const getCategoryIcon = (category?: string | null) => {
    switch (category?.toLowerCase()) {
      case "add_money":
        return <CircleDollarSign className="h-3 w-3" />;
      case "posting_fee":
        return <Receipt className="h-3 w-3" />;
      case "boost":
        return <TrendingUp className="h-3 w-3" />;
      case "refund":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Wallet className="h-3 w-3" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today, " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday, " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: diffDays > 365 ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Summary stats
  const totalCredits = txs
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDebits = txs
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const visibleTxs = filteredTxs.slice(0, displayLimit);
  const hasMore = filteredTxs.length > displayLimit;

  if (loading) {
    return (
      <Card className={`border-emerald-500/20 bg-background/50 ${className}`}>
        {showHeader && (
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-background via-background to-emerald-500/5 shadow-lg">
        {/* Decorative blur */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {showHeader && (
          <CardHeader className="pb-0 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Receipt className="h-4 w-4 text-emerald-500" />
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
            </div>

            {/* Summary stats */}
            {txs.length > 0 && (
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-muted-foreground">In:</span>
                  <span className="font-semibold text-emerald-500">
                    ₹{totalCredits.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <ArrowUpRight className="h-3 w-3 text-rose-500" />
                  <span className="text-muted-foreground">Out:</span>
                  <span className="font-semibold text-rose-500">
                    ₹{totalDebits.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
        )}

        <CardContent className="pt-4 relative">
          {/* Filter chips */}
          {txs.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1.5">
                {(["all", "credit", "debit"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-all duration-200 ${
                      filter === f
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                    }`}
                  >
                    {f === "all" ? "All" : f === "credit" ? "Credits" : "Debits"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {filteredTxs.length} transaction{filteredTxs.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Transaction list */}
          <AnimatePresence mode="popLayout">
            {visibleTxs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filter === "all"
                    ? "No transactions yet"
                    : filter === "credit"
                    ? "No credits yet"
                    : "No debits yet"}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {filter === "all"
                    ? "Add money or make a payment to see activity here"
                    : "Try switching to a different filter"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {visibleTxs.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 border border-transparent hover:border-emerald-500/10"
                  >
                    {getIcon(tx)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.description || (tx.type === "credit" ? "Money Added" : "Payment Made")}
                        </p>
                        {tx.category && (
                          <span className="text-muted-foreground">
                            {getCategoryIcon(tx.category)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${getAmountColor(tx)}`}>
                        {formatAmount(tx)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                className="text-xs text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                Load more ({filteredTxs.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
