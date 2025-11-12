import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InsightDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight: string;
  month: string;
}

export const InsightDrawer = ({ open, onOpenChange, insight, month }: InsightDrawerProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: "spring", damping: 25 }}
          className="absolute top-0 right-0 h-full w-[400px] z-20"
        >
          <Card className="h-full glass-panel border-l border-primary/20 rounded-none rounded-l-xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">AI Market Insights</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Current Month Analysis */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{month} Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight}
                </p>
              </div>

              {/* AI Predictions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Key Insights
                </h4>
                
                <div className="p-3 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    🔥 Transaction volumes are trending upward, indicating strong buyer interest in premium localities.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    📈 Trust-verified properties command a 12-15% premium over unverified listings.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    💡 Kokapet and Gachibowli show highest liquidity with fast turnaround times.
                  </p>
                </div>
              </div>

              {/* Market Alerts */}
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-500 mb-1">Market Alert</p>
                    <p className="text-xs text-muted-foreground">
                      Forecast confidence dropping in select areas due to seasonal liquidity cooling.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Recommendations */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3">Recommended Actions</h4>
                <div className="space-y-2">
                  <Button size="sm" className="w-full justify-start" variant="outline">
                    📍 Explore High-Growth Localities
                  </Button>
                  <Button size="sm" className="w-full justify-start" variant="outline">
                    🎯 Add to Watchlist
                  </Button>
                  <Button size="sm" className="w-full justify-start" variant="outline">
                    📊 View Detailed Forecast
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
