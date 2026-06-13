import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Shield, Star, Crown, Gem } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  trustScore: number;
}

const LEVELS = [
  { level: 1, name: "Standard Agent", min: 0, max: 49, color: "bg-gray-500", icon: Shield },
  { level: 2, name: "Blue Badge", min: 50, max: 69, color: "bg-blue-500", icon: Award },
  { level: 3, name: "Verified Agent — Green Badge", min: 70, max: 84, color: "bg-green-600", icon: Star },
  { level: 4, name: "Premium Agent — Gold Badge", min: 85, max: 94, color: "bg-yellow-500", icon: Crown },
  { level: 5, name: "Elite Partner — Black Premium", min: 95, max: 100, color: "bg-black border border-yellow-500", icon: Gem },
];

export default function AgentBadgeLevel({ trustScore }: Props) {
  const current = LEVELS.find((l) => trustScore >= l.min && trustScore <= l.max) || LEVELS[0];
  const next = LEVELS[current.level] || null;
  const progress = next ? Math.min(100, ((trustScore - current.min) / (next.min - current.min)) * 100) : 100;
  const Icon = current.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Agent Badge Level</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
        >
          <div className={`${current.color} text-white rounded-full p-4`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Level {current.level}</p>
            <h3 className="text-lg font-bold">{current.name}</h3>
            <p className="text-sm text-muted-foreground">Trust Score: {trustScore}/100</p>
          </div>
        </motion.div>

        {next && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {next.name}</span>
              <span className="font-medium">{trustScore} / {next.min}</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 pt-2">
          {LEVELS.map((l) => {
            const I = l.icon;
            const reached = trustScore >= l.min;
            return (
              <div key={l.level} className={`text-center p-2 rounded-md ${reached ? l.color + " text-white" : "bg-muted text-muted-foreground"}`}>
                <I className="h-4 w-4 mx-auto" />
                <p className="text-[10px] mt-1">L{l.level}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
