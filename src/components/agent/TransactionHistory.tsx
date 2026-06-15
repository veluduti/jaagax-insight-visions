import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight, Receipt, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Txn {
  id: string;
  amount: number;
  type: "credit" | "debit" | string;
  category: string | null;
  description: string | null;
  status: string | null;
  reference_id: string | null;
  created_at: string;
}

interface TransactionHistoryProps {
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  limit?: number;
}

export default function TransactionHistory({ userId, open, onOpenChange, limit = 20 }: TransactionHistoryProps) {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [filteredTxns, setFilteredTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use dialog open state if provided, otherwise use internal state
  const showDialog = open !== undefined ? open : isDialogOpen;
  const setShowDialog = onOpenChange || setIsDialogOpen;

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data } = await sb
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setTxns(data || []);
    setFilteredTxns(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const handler = () => load();
    window.addEventListener("walletUpdated", handler);
    return () => window.removeEventListener("walletUpdated", handler);
  }, [userId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...txns];

    // Apply search
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(search.toLowerCase()) ||
          t.category?.toLowerCase().includes(search.toLowerCase()) ||
          t.reference_id?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    setFilteredTxns(filtered);
  }, [search, typeFilter, txns]);

  const downloadCSV = () => {
    const headers = ["Date", "Description", "Category", "Type", "Amount", "Status", "Reference ID"];
    const rows = filteredTxns.map((t) => [
      format(new Date(t.created_at), "dd/MM/yyyy HH:mm:ss"),
      t.description || "",
      t.category || "",
      t.type === "credit" ? "Credit" : "Debit",
      t.amount,
      t.status || "",
      t.reference_id || "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transaction history downloaded");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    switch (status.toLowerCase()) {
      case "success":
      case "completed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]">Success</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 text-[10px]">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 text-[10px]">Failed</Badge>;
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  const summary = {
    totalCredit: filteredTxns.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0),
    totalDebit: filteredTxns.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0),
  };

  const Content = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[110px] h-8 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={downloadCSV} disabled={filteredTxns.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Export
        </Button>
        {(search || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
            }}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      {filteredTxns.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
            <p className="text-[10px] text-muted-foreground">Total Credit</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.totalCredit)}</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 text-center">
            <p className="text-[10px] text-muted-foreground">Total Debit</p>
            <p className="text-sm font-bold text-red-600">{formatCurrency(summary.totalDebit)}</p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filteredTxns.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No transactions found
        </div>
      ) : (
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {filteredTxns.map((t) => {
            const isCredit = t.type === "credit";
            return (
              <div key={t.id} className="py-3 flex items-center gap-3">
                <div
                  className={`p-2 rounded-full shrink-0 ${
                    isCredit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || t.category || "Transaction"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                    {getStatusBadge(t.status)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                    {isCredit ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </p>
                  {t.category && <p className="text-[10px] text-muted-foreground capitalize">{t.category}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // If open/onOpenChange props are provided, render as Dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Transaction History
            </DialogTitle>
            <DialogDescription>
              View all your wallet transactions including deposits, promotions, and subscriptions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Content />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render as Card (for dashboard)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Content />
      </CardContent>
    </Card>
  );
}
