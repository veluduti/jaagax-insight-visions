import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Gift, ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { useWallet, formatINR, WalletTransaction } from "@/contexts/WalletContext";
import { AddMoneyModal } from "./AddMoneyModal";
import { TransactionHistory } from "./TransactionHistory";
import { AutoRecharge } from "./AutoRecharge";
import { CashBackSection } from "./CashBackSection";

const QUICK_ADD = [500, 1000, 2000, 5000, 10000];

export function WalletDashboard() {
  const { balance, cashBack, getTransactionHistory, isLoading } = useWallet();
  const [params, setParams] = useSearchParams();
  const section = params.get("section") || "overview";
  const [recent, setRecent] = useState<WalletTransaction[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [presetAmount, setPresetAmount] = useState<number | undefined>();

  useEffect(() => {
    getTransactionHistory(5).then(setRecent).catch(() => setRecent([]));
  }, [balance, getTransactionHistory]);

  const openAdd = (a?: number) => { setPresetAmount(a); setAddOpen(true); };

  const setSection = (s: string) => {
    const next = new URLSearchParams(params);
    next.set("section", s);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2"><WalletIcon className="h-4 w-4" /> Wallet Balance</p>
              <p className="text-4xl font-bold mt-1">{isLoading ? "…" : formatINR(balance)}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Gift className="h-3 w-3 text-emerald-600" /> Cashback available: <span className="text-emerald-600 font-medium">{formatINR(cashBack.total)}</span>
              </p>
            </div>
            <Button onClick={() => openAdd()} size="lg"><Plus className="h-4 w-4 mr-2" />Add Money</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {QUICK_ADD.map(a => (
              <Button key={a} variant="outline" size="sm" onClick={() => openAdd(a)}>+ ₹{a.toLocaleString("en-IN")}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="autorecharge">Auto Recharge</TabsTrigger>
          <TabsTrigger value="cashback">Cash Back</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet. Add money to get started.</p>
              ) : (
                <div className="divide-y border rounded-md">
                  {recent.map(t => (
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
                        <Badge variant="outline" className="text-[10px] mt-1 capitalize">{t.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4"><TransactionHistory /></TabsContent>
        <TabsContent value="autorecharge" className="mt-4"><AutoRecharge /></TabsContent>
        <TabsContent value="cashback" className="mt-4"><CashBackSection /></TabsContent>
      </Tabs>

      <AddMoneyModal open={addOpen} onOpenChange={setAddOpen} initialAmount={presetAmount} />
    </div>
  );
}

export default WalletDashboard;
