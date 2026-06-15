import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { format } from "date-fns";

interface Txn {
  id: string;
  amount: number;
  type: "credit" | "debit" | string;
  category: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
}

export default function TransactionHistory({ userId, limit = 20 }: { userId: string; limit?: number }) {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const handler = () => load();
    window.addEventListener("walletUpdated", handler);
    return () => window.removeEventListener("walletUpdated", handler);
  }, [userId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" /> Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <div className="divide-y">
            {txns.map((t) => {
              const isCredit = t.type === "credit";
              return (
                <div key={t.id} className="py-3 flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      isCredit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.description || t.category || "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        isCredit ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                    </p>
                    {t.status && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {t.status}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
