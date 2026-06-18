import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Download, Loader2, Search } from "lucide-react";
import { useWallet, WalletTransaction, formatINR } from "@/contexts/WalletContext";

const PAGE_SIZE = 10;

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "completed") return "default";
  if (s === "pending") return "secondary";
  if (s === "failed") return "destructive";
  return "outline";
}

export function TransactionHistory() {
  const { getTransactionHistory } = useWallet();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "credit" | "debit">("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try { setItems(await getTransactionHistory(500)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => items.filter(t =>
    (type === "all" || t.type === type) &&
    (q ? (t.description || "").toLowerCase().includes(q.toLowerCase()) : true)
  ), [items, q, type]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const header = ["Date", "Description", "Category", "Type", "Amount", "Status", "Reference"];
    const rows = filtered.map(t => [
      new Date(t.created_at).toISOString(),
      (t.description || "").replace(/,/g, " "),
      t.category || "",
      t.type,
      t.amount,
      t.status,
      t.reference_id || t.reference || "",
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `transactions_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle>Transaction History</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Search description…" className="pl-8" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={type} onValueChange={(v: any) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No transactions found</div>
        ) : (
          <div className="divide-y border rounded-md">
            {pageItems.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {t.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || t.category || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.type === "credit" ? "+" : "-"}{formatINR(Number(t.amount))}
                  </p>
                  <Badge variant={statusVariant(t.status)} className="text-[10px] mt-1 capitalize">{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionHistory;
