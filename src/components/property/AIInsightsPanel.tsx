import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Target, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AIInsightsPanelProps {
  property: {
    price: number;
    area: number;
    locality: string;
    city: string;
  };
  valuation: any;
}

const AIInsightsPanel = ({ property, valuation }: AIInsightsPanelProps) => {
  if (!valuation) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel rounded-xl p-6 sticky top-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">AI Insights</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Analyzing property...</p>
        </div>
      </motion.div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel rounded-xl p-6 sticky top-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">AI Insights</h3>
      </div>

      {/* Valuation Range */}
      <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Valuation Range</span>
        </div>
        <div className="text-2xl font-bold text-primary">
          {formatPrice(valuation.valuationMin)} - {formatPrice(valuation.valuationMax)}
        </div>
      </div>

      {/* Appreciation */}
      <div className="mb-6 p-4 rounded-lg bg-background/50">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Area Appreciation</span>
        </div>
        <div className="text-xl font-bold text-green-500">
          +{valuation.appreciation}% (12 months)
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Summary</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {valuation.summary}
        </p>
      </div>

      {/* Investment Score */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
        <div className="text-sm text-muted-foreground mb-1">Investment Score</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{valuation.investmentScore}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
        <div className="mt-2 h-2 bg-background/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${valuation.investmentScore}%` }}
          />
        </div>
      </div>

      {/* Risk Factors */}
      {valuation.risks && valuation.risks.length > 0 && (
        <div className="mt-4">
          <span className="text-sm font-medium">Risk Factors</span>
          <ul className="mt-2 space-y-1">
            {valuation.risks.map((risk: string, idx: number) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">⚠</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default AIInsightsPanel;
