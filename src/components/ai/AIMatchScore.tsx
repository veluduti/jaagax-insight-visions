import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Sparkles, MapPin, Building, TrendingUp, Users, Heart, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MatchReason {
  icon: React.ReactNode;
  label: string;
  score: number;
  explanation: string;
}

interface AIMatchScoreProps {
  propertyId: number;
  matchScore: number;
  reasons?: MatchReason[];
  compact?: boolean;
  className?: string;
}

const defaultReasons: MatchReason[] = [
  {
    icon: <MapPin className="h-4 w-4" />,
    label: "Location Match",
    score: 92,
    explanation: "Close to your preferred areas and commute-friendly"
  },
  {
    icon: <Building className="h-4 w-4" />,
    label: "Property Type",
    score: 88,
    explanation: "Matches your 3BHK preference with modern amenities"
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Investment Potential",
    score: 85,
    explanation: "Strong appreciation history in this micro-market"
  },
  {
    icon: <Users className="h-4 w-4" />,
    label: "Community Fit",
    score: 78,
    explanation: "Family-friendly neighborhood with good schools nearby"
  }
];

const AIMatchScore = ({ 
  propertyId, 
  matchScore, 
  reasons = defaultReasons,
  compact = false,
  className 
}: AIMatchScoreProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-orange-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return "from-green-500/20 to-emerald-500/10";
    if (score >= 70) return "from-yellow-500/20 to-amber-500/10";
    return "from-orange-500/20 to-red-500/10";
  };

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
          "bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30",
          className
        )}
      >
        <Brain className="h-3 w-3 text-primary" />
        <span className={cn("font-bold text-sm", getScoreColor(matchScore))}>
          {matchScore}%
        </span>
        <span className="text-xs text-muted-foreground">match</span>
      </motion.div>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden border-0 shadow-lg",
      `bg-gradient-to-br ${getScoreGradient(matchScore)}`,
      className
    )}>
      <motion.div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border-2 border-primary/50">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(hsl(var(--primary)) ${matchScore}%, transparent ${matchScore}%)`
                  }}
                />
                <span className={cn("text-xl font-bold z-10", getScoreColor(matchScore))}>
                  {matchScore}
                </span>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">AI Match Score</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personalized for your preferences
              </p>
            </div>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>

        {/* Quick Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {matchScore >= 85 && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300 border-0">
              <Heart className="h-3 w-3 mr-1" />
              Perfect Match
            </Badge>
          )}
          {matchScore >= 70 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
              <Shield className="h-3 w-3 mr-1" />
              TruScore Verified
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Expanded Reasons */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Why This Works For You
              </h4>
              
              <div className="space-y-3">
                {reasons.map((reason, index) => (
                  <motion.div
                    key={reason.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          {reason.icon}
                        </div>
                        <span className="text-sm font-medium">{reason.label}</span>
                      </div>
                      <span className={cn("text-sm font-bold", getScoreColor(reason.score))}>
                        {reason.score}%
                      </span>
                    </div>
                    <Progress value={reason.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground pl-8">
                      {reason.explanation}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <Brain className="h-3 w-3 inline mr-1 text-primary" />
                  This score is calculated based on your browsing history, saved searches, 
                  and property preferences. The more you interact, the smarter it gets!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default AIMatchScore;
