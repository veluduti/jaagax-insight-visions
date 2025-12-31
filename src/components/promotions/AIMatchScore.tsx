import { motion } from "framer-motion";
import { Brain, Sparkles, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIMatchScoreProps {
  score: number;
  reasons: string[];
  compact?: boolean;
}

const AIMatchScore = ({ score, reasons, compact = false }: AIMatchScoreProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return "text-green-400";
    if (s >= 75) return "text-emerald-400";
    if (s >= 60) return "text-amber-400";
    return "text-orange-400";
  };

  const getScoreGradient = (s: number) => {
    if (s >= 90) return "from-green-500 to-emerald-500";
    if (s >= 75) return "from-emerald-500 to-teal-500";
    if (s >= 60) return "from-amber-500 to-yellow-500";
    return "from-orange-500 to-red-500";
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5"
      >
        <Brain className="h-4 w-4 text-purple-400" />
        <span className={cn("font-bold text-sm", getScoreColor(score))}>
          {score}% Match
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Brain className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-white/60">AI Match Score</p>
            <p className={cn("text-2xl font-bold", getScoreColor(score))}>
              {score}%
            </p>
          </div>
        </div>
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 176} 176`}
              initial={{ strokeDasharray: "0 176" }}
              animate={{ strokeDasharray: `${(score / 100) * 176} 176` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={score >= 75 ? "#10b981" : "#f59e0b"} />
                <stop offset="100%" stopColor={score >= 75 ? "#06b6d4" : "#ef4444"} />
              </linearGradient>
            </defs>
          </svg>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        {reasons.slice(0, 3).map((reason, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2 text-sm text-white/80"
          >
            <Target className="h-3 w-3 text-primary" />
            <span>{reason}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AIMatchScore;
