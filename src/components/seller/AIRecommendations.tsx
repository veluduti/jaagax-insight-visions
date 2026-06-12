import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users, Target, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  propertyCount: number;
  topCity?: string | null;
  avgPrice?: number;
}

export default function AIRecommendations({ propertyCount, topCity, avgPrice }: Props) {
  const navigate = useNavigate();
  // Lightweight heuristic match score so this works without an AI call.
  const matchScore = Math.min(95, 60 + propertyCount * 8 + (topCity ? 6 : 0));
  const pricePrediction = avgPrice ? Math.round(avgPrice * 1.06) : null;

  const cards = [
    {
      icon: Target, title: "Smart Match Score", value: `${matchScore}%`,
      hint: "Buyers your listings appeal to most this week",
    },
    {
      icon: TrendingUp, title: "Price Prediction",
      value: pricePrediction ? `₹${pricePrediction.toLocaleString("en-IN")}` : "—",
      hint: "Estimated fair value (avg + 6% momentum)",
    },
    ...(topCity ? [{
      icon: MapPin, title: "Hot locality",
      value: topCity,
      hint: "Most of your interest is coming from here",
    }] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border-emerald-500/20 bg-gradient-to-br from-background via-background to-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-400" /> AI Recommendations
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">Personalised</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cards.map((c) => (
              <div key={c.title} className="rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-medium">{c.title}</p>
                </div>
                <p className="text-xl font-bold tracking-tight">{c.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{c.hint}</p>
              </div>
            ))}
          </div>

          {propertyCount >= 2 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>You have <b>{propertyCount}</b> properties — upgrade to an Agent profile to start getting leads.</span>
              </div>
              <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={() => navigate("/select-profile")}>
                Switch to Agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
