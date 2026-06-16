import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet as WalletIcon,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import {
  walletService,
  formatCurrency,
  type TransactionCategory,
  type Wallet,
  type WalletStats,
  type WalletTransaction,
} from "@/services/walletService";
import AddMoneyModal from "./AddMoneyModal";
import AutoRechargeModal from "./AutoRechargeModal";

type CategoryFilter = "all" | TransactionCategory;

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All transactions" },
  { value: "add_money", label: "Top-ups" },
  { value: "promotion", label: "Promotions" },
  { value: "lead_purchase", label: "Lead purchases" },
  { value: "subscription", label: "Subscriptions" },
  { value: "cashback", label: "Cashback" },
  { value: "referral", label: "Referrals" },
  { value: "refund", label: "Refunds" },
  { value: "withdrawal", label: "Withdrawals" },
];

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border-slate-700/60 bg-slate-900/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
          </div>
          <div className={`rounded-md p-2 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.type === "credit";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            isCredit ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">
            {txn.description || (isCredit ? "Wallet credit" : "Wallet debit")}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
            <span>{new Date(txn.created_at).toLocaleString()}</span>
            {txn.category && (
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-800">
                {txn.category.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isCredit ? "text-emerald-300" : "text-rose-300"}`}>
          {isCredit ? "+" : "-"}
          {formatCurrency(Number(txn.amount ?? 0))}
        </p>
        <p className="text-xs uppercase text-slate-500">{txn.status}</p>
      </div>
    </div>
  );
}

export default function BuilderWallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [w, s, txns] = await Promise.all([
        walletService.getOrCreateWallet(),
        walletService.getWalletStats(),
        walletService.listTransactions({ limit: 100 }),
      ]);
      setWallet(w);
      setStats(s);
      setTransactions(txns);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load wallet";
      toast.error("Wallet error", { description: message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.category === filter);
  }, [transactions, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12 space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/builder")}
              className="mb-2 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Wallet</h1>
            <p className="text-muted-foreground mt-1">Manage your balance and transactions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddOpen(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="h-4 w-4 mr-2" />
              Add Money
            </Button>
            <Button
              variant="outline"
              onClick={() => setAutoOpen(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              <Zap className="h-4 w-4 mr-2" />
              {wallet?.auto_recharge ? "Auto ON" : "Auto-Recharge"}
            </Button>
          </div>
        </div>

        {/* Balance Hero Card */}
        <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-300">
                <WalletIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Wallet balance</span>
              </div>
              <p className="mt-2 text-4xl font-bold text-slate-50">
                {formatCurrency(stats?.balance ?? 0, wallet?.currency)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Spent this month:{" "}
                <span className="font-medium text-slate-200">{formatCurrency(stats?.monthSpend ?? 0)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={refreshing}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Credited"
            value={formatCurrency(stats?.totalCredits ?? 0)}
            icon={<ArrowDownLeft className="h-4 w-4 text-emerald-300" />}
            color="bg-emerald-500/15"
          />
          <StatCard
            label="Total Spent"
            value={formatCurrency(stats?.totalDebits ?? 0)}
            icon={<ArrowUpRight className="h-4 w-4 text-rose-300" />}
            color="bg-rose-500/15"
          />
          <StatCard
            label="This Month"
            value={formatCurrency(stats?.monthSpend ?? 0)}
            icon={<TrendingUp className="h-4 w-4 text-amber-300" />}
            color="bg-amber-500/15"
          />
          <StatCard
            label="Transactions"
            value={String(stats?.transactionCount ?? 0)}
            icon={<WalletIcon className="h-4 w-4 text-sky-300" />}
            color="bg-sky-500/15"
          />
        </div>

        {/* Transactions */}
        <Card className="border-slate-700/60 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
            <CardTitle className="text-base text-slate-100">Transaction History</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as CategoryFilter)}>
              <SelectTrigger className="h-9 w-[180px] border-slate-700 bg-slate-800 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
                <WalletIcon className="h-8 w-8 text-slate-600" />
                <p className="text-sm">No transactions yet.</p>
                <Button
                  size="sm"
                  onClick={() => setAddOpen(true)}
                  className="mt-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add your first top-up
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filtered.map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <AddMoneyModal open={addOpen} onOpenChange={setAddOpen} onSuccess={() => load()} />
        <AutoRechargeModal open={autoOpen} onOpenChange={setAutoOpen} onSaved={() => load()} />
      </div>
    </div>
  );
}
