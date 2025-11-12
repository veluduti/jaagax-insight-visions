import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Activity, MapPin, Shield, Sparkles, Home } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MarketPulseRibbonProps {
  avgPrice: number;
  yoyGrowth: number;
  liquidity: number;
  topLocality: string;
  trustAdjustedPrice: number;
  aiConfidence: number;
  totalTransactions: number;
}

export const MarketPulseRibbon = ({
  avgPrice,
  yoyGrowth,
  liquidity,
  topLocality,
  trustAdjustedPrice,
  aiConfidence,
  totalTransactions,
}: MarketPulseRibbonProps) => {
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
    return `₹${price.toFixed(0)}`;
  };

  const pulseCards = [
    {
      icon: DollarSign,
      label: "Avg Price (30d)",
      value: formatPrice(avgPrice),
      subValue: "per property",
      gradient: "from-emerald-500/20 to-primary/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: TrendingUp,
      label: "YoY Growth",
      value: `${yoyGrowth > 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`,
      subValue: "year over year",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: Activity,
      label: "Market Liquidity",
      value: `${liquidity}`,
      subValue: "transactions/month",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
    },
    {
      icon: MapPin,
      label: "Top Rising Locality",
      value: topLocality,
      subValue: "highest demand",
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-400",
    },
    {
      icon: Shield,
      label: "Trust-Adjusted Price",
      value: formatPrice(trustAdjustedPrice),
      subValue: "verified properties",
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
    },
    {
      icon: Sparkles,
      label: "AI Forecast Confidence",
      value: `${aiConfidence}%`,
      subValue: "prediction accuracy",
      gradient: "from-primary/30 to-accent/30",
      iconColor: "text-primary",
    },
    {
      icon: Home,
      label: "Total Transactions",
      value: totalTransactions.toString(),
      subValue: "verified deals",
      gradient: "from-indigo-500/20 to-violet-500/20",
      iconColor: "text-indigo-400",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden py-6 mb-12">
      {/* Gradient Blur Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-primary/5 to-background blur-xl" />
      
      <motion.div
        className="flex gap-6"
        animate={{
          x: [0, -100 * pulseCards.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 40,
            ease: "linear",
          },
        }}
      >
        {/* Render cards twice for seamless loop */}
        {[...pulseCards, ...pulseCards].map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05, y: -5 }}
            className="min-w-[280px]"
          >
            <Card className={`glass-panel p-6 bg-gradient-to-br ${card.gradient} border-primary/20 hover:glow-effect transition-all`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {card.label}
                  </div>
                  <div className="text-2xl font-bold text-gradient mb-1">
                    {card.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {card.subValue}
                  </div>
                </div>
                <card.icon className={`h-8 w-8 ${card.iconColor}`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
