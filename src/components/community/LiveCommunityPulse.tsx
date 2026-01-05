import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, MapPin, Users, Building, TrendingUp, 
  Eye, Heart, MessageCircle, Clock, Sparkles,
  Home, Calendar, Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PulseActivity {
  id: string;
  type: "view" | "inquiry" | "booking" | "price_change" | "new_listing" | "sold";
  locality: string;
  message: string;
  time: string;
  icon: React.ReactNode;
  color: string;
}

interface LocalityStats {
  name: string;
  activeUsers: number;
  inquiriesLast24h: number;
  priceChange: number;
  hotness: number;
}

interface LiveCommunityPulseProps {
  city?: string;
  className?: string;
}

const LiveCommunityPulse = ({ city = "Hyderabad", className }: LiveCommunityPulseProps) => {
  const [activities, setActivities] = useState<PulseActivity[]>([]);
  const [localityStats, setLocalityStats] = useState<LocalityStats[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Demo activities - in production, this would come from real-time subscriptions
  const sampleActivities: Omit<PulseActivity, "id" | "time">[] = [
    { type: "view", locality: "Gachibowli", message: "5 people viewing properties", icon: <Eye className="h-4 w-4" />, color: "text-blue-500" },
    { type: "inquiry", locality: "Hitech City", message: "New inquiry for 3BHK apartment", icon: <MessageCircle className="h-4 w-4" />, color: "text-green-500" },
    { type: "booking", locality: "Kondapur", message: "Site visit booked for tomorrow", icon: <Calendar className="h-4 w-4" />, color: "text-purple-500" },
    { type: "price_change", locality: "Jubilee Hills", message: "Price reduced by ₹15L on villa", icon: <TrendingUp className="h-4 w-4" />, color: "text-orange-500" },
    { type: "new_listing", locality: "Madhapur", message: "New 2BHK listed at ₹85L", icon: <Home className="h-4 w-4" />, color: "text-cyan-500" },
    { type: "sold", locality: "Banjara Hills", message: "3BHK sold in 7 days!", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500" },
  ];

  const demoLocalityStats: LocalityStats[] = [
    { name: "Gachibowli", activeUsers: 45, inquiriesLast24h: 28, priceChange: 2.5, hotness: 95 },
    { name: "Hitech City", activeUsers: 38, inquiriesLast24h: 22, priceChange: 1.8, hotness: 88 },
    { name: "Kondapur", activeUsers: 32, inquiriesLast24h: 19, priceChange: 3.2, hotness: 82 },
    { name: "Jubilee Hills", activeUsers: 28, inquiriesLast24h: 15, priceChange: -0.5, hotness: 75 },
    { name: "Madhapur", activeUsers: 25, inquiriesLast24h: 18, priceChange: 2.1, hotness: 78 },
  ];

  useEffect(() => {
    setLocalityStats(demoLocalityStats);
    
    // Initialize with some activities
    const initialActivities = sampleActivities.slice(0, 3).map((a, i) => ({
      ...a,
      id: `initial-${i}`,
      time: "Just now"
    }));
    setActivities(initialActivities);

    // Simulate real-time updates
    if (isLive) {
      const interval = setInterval(() => {
        const randomActivity = sampleActivities[Math.floor(Math.random() * sampleActivities.length)];
        const newActivity: PulseActivity = {
          ...randomActivity,
          id: Date.now().toString(),
          time: "Just now"
        };
        
        setActivities(prev => {
          const updated = [newActivity, ...prev].slice(0, 10);
          // Update times
          return updated.map((a, i) => ({
            ...a,
            time: i === 0 ? "Just now" : `${i * 2}m ago`
          }));
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isLive]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500">
              <Activity className="h-5 w-5 text-white" />
            </div>
            {isLive && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              Live Community Pulse
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {city}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Real-time activity in your target areas
            </p>
          </div>
        </div>
        <Badge 
          variant={isLive ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setIsLive(!isLive)}
        >
          <motion.div
            className={cn("w-2 h-2 rounded-full mr-2", isLive ? "bg-green-400" : "bg-muted-foreground")}
            animate={isLive ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          {isLive ? "Live" : "Paused"}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Live Activity Feed
          </h4>
          <ScrollArea className="h-[280px]">
            <div className="space-y-3 pr-4">
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <div className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-colors",
                      index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                    )}>
                      <div className={cn("p-2 rounded-full bg-background", activity.color)}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.locality}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </Card>

        {/* Locality Hotness */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Locality Hotness Index
          </h4>
          <div className="space-y-3">
            {localityStats.map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{stat.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={stat.priceChange > 0 ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          stat.priceChange > 0 ? "bg-green-500/20 text-green-700 dark:text-green-300" : ""
                        )}
                      >
                        {stat.priceChange > 0 ? "+" : ""}{stat.priceChange}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stat.activeUsers} active
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {stat.inquiriesLast24h} inquiries
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.hotness}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <strong>AI Insight:</strong> Gachibowli seeing 40% more activity than last week. 
              Consider acting fast on properties here!
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveCommunityPulse;
