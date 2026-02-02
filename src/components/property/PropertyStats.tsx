import { Card, CardContent } from "@/components/ui/card";
import { Eye, Heart, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

interface PropertyStatsProps {
  entityId: string;
  entityType: "property" | "project";
}

const PropertyStats = ({ entityId, entityType }: PropertyStatsProps) => {
  // Using mock stats until analytics table is created
  const stats = {
    impressions: Math.floor(Math.random() * 500) + 100,
    favorites: Math.floor(Math.random() * 50) + 10,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.impressions)}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.favorites)}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">High</p>
              <p className="text-xs text-muted-foreground">Demand</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">Active</p>
              <p className="text-xs text-muted-foreground">Interest</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyStats;