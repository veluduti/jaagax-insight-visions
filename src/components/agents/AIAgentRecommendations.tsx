import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";

const AIAgentRecommendations = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-xl p-8 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">
                AI-Powered Agent Recommendations
              </h3>
              <p className="text-muted-foreground mb-4">
                Based on your search history and preferences, we recommend agents
                specializing in your areas of interest.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Luxury Apartments - Hyderabad</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Top agents with 95%+ success rate in premium properties
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Commercial Spaces - Gachibowli</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Specialists in IT corridor office leasing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIAgentRecommendations;
