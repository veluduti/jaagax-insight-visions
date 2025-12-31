import { Sparkles } from "lucide-react";

interface MatchBadgeProps {
  score?: number;
  className?: string;
}

const MatchBadge = ({ score, className = "" }: MatchBadgeProps) => {
  if (!score || score < 50) return null;

  const getColor = () => {
    if (score >= 85) return "bg-emerald-500/90 text-white";
    if (score >= 70) return "bg-primary/90 text-primary-foreground";
    return "bg-amber-500/90 text-white";
  };

  return (
    <div
      className={`absolute top-3 right-12 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getColor()} ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      <span>{score}%</span>
    </div>
  );
};

export default MatchBadge;
