import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface Item { id: string; activity_type: string; metadata: any; created_at: string }

export default function ActivityTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!userId) return;
    const sb: any = supabase;
    sb.from("seller_activity_logs")
      .select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(15)
      .then(({ data }: any) => setItems(data || []));
  }, [userId]);

  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
            <Activity className="h-4 w-4 text-emerald-400" /> Activity Timeline
          </div>
          <ol className="relative border-l border-border/60 pl-4 space-y-3">
            {items.map((it) => (
              <li key={it.id}>
                <span className="absolute -left-[5px] mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-medium capitalize">{it.activity_type.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </motion.div>
  );
}
