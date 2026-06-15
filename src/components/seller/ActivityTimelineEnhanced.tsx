import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Search as SearchIcon,
  Calendar,
  Home,
  Wallet,
  Banknote,
} from "lucide-react";

interface Item {
  id: string;
  category: "search" | "visit" | "posting" | "wallet" | "enquiry";
  title: string;
  description?: string;
  date: string;
}

const ICON: Record<Item["category"], any> = {
  search: SearchIcon,
  visit: Calendar,
  posting: Home,
  wallet: Wallet,
  enquiry: Banknote,
};

const COLOR: Record<Item["category"], string> = {
  search: "bg-blue-500/10 text-blue-500",
  visit: "bg-purple-500/10 text-purple-500",
  posting: "bg-emerald-500/10 text-emerald-500",
  wallet: "bg-amber-500/10 text-amber-500",
  enquiry: "bg-rose-500/10 text-rose-500",
};

export default function ActivityTimelineEnhanced({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sb: any = supabase;
      const [postings, tx, visits, searches, enquiries] = await Promise.all([
        sb
          .from("properties")
          .select("id,title,created_at")
          .eq("submitted_by", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        sb
          .from("wallet_transactions")
          .select("id,description,amount,type,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        sb
          .from("visit_bookings")
          .select("id,scheduled_at,status,created_at")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        sb
          .from("saved_searches")
          .select("id,name,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        sb
          .from("financial_enquiries")
          .select("id,loan_type,amount_requested,status,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const all: Item[] = [];
      (postings.data || []).forEach((p: any) =>
        all.push({
          id: `p-${p.id}`,
          category: "posting",
          title: `Listed: ${p.title}`,
          date: p.created_at,
        }),
      );
      (tx.data || []).forEach((t: any) =>
        all.push({
          id: `w-${t.id}`,
          category: "wallet",
          title: `${t.type === "credit" ? "+" : "-"}₹${Number(t.amount).toLocaleString("en-IN")} • ${t.description || "Wallet"}`,
          date: t.created_at,
        }),
      );
      (visits.data || []).forEach((v: any) =>
        all.push({
          id: `v-${v.id}`,
          category: "visit",
          title: `Visit ${v.status}`,
          description: v.scheduled_at ? new Date(v.scheduled_at).toLocaleString("en-IN") : undefined,
          date: v.created_at,
        }),
      );
      (searches.data || []).forEach((s: any) =>
        all.push({
          id: `s-${s.id}`,
          category: "search",
          title: `Saved search: ${s.name || "Untitled"}`,
          date: s.created_at,
        }),
      );
      (enquiries.data || []).forEach((e: any) =>
        all.push({
          id: `e-${e.id}`,
          category: "enquiry",
          title: `${e.loan_type.replace(/_/g, " ")} • ₹${Number(e.amount_requested || 0).toLocaleString("en-IN")}`,
          description: `Status: ${e.status}`,
          date: e.created_at,
        }),
      );

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(all.slice(0, 30));
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-emerald-500" /> Activity Timeline
        </CardTitle>
        <CardDescription>Searches, visits, postings, wallet usage & enquiries — all in one place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
        ) : (
          items.map((it) => {
            const Icon = ICON[it.category];
            return (
              <div key={it.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                <div className={`p-1.5 rounded-md ${COLOR[it.category]} shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{it.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {it.category}
                    </Badge>
                  </div>
                  {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(it.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
