import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PropertyStatsProps {
  entityId: string;
  entityType: "property" | "project";
}

const formatNumber = (num: number) => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const PropertyStats = ({ entityId, entityType }: PropertyStatsProps) => {
  const [views, setViews] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number | null>(null);

  useEffect(() => {
    if (!entityId || entityType !== "property") return;
    let cancelled = false;

    (async () => {
      const [viewsRes, favRes] = await Promise.all([
        (supabase as any)
          .from("property_events")
          .select("id", { count: "exact", head: true })
          .eq("property_id", entityId)
          .eq("event_type", "view"),
        (supabase as any)
          .from("favorites")
          .select("property_id", { count: "exact", head: true })
          .eq("property_id", entityId),
      ]);
      if (cancelled) return;
      setViews(viewsRes.count ?? 0);
      setFavorites(favRes.count ?? 0);
    })();

    return () => { cancelled = true; };
  }, [entityId, entityType]);

  // Nothing loaded yet — render nothing rather than fake values.
  if (views === null && favorites === null) return null;

  const cards: { icon: any; iconBg: string; iconColor: string; value: string; label: string }[] = [];
  if (views !== null) cards.push({ icon: Eye, iconBg: "bg-blue-500/10", iconColor: "text-blue-500", value: formatNumber(views), label: "Views" });
  if (favorites !== null) cards.push({ icon: Heart, iconBg: "bg-red-500/10", iconColor: "text-red-500", value: formatNumber(favorites), label: "Favorites" });

  if (cards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 gap-4 mb-6"
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.iconBg}`}>
                  <Icon className={`h-5 w-5 ${c.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
};

export default PropertyStats;
