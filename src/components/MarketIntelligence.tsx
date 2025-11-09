import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin, BarChart3, Target } from "lucide-react";

const trendingAreas = [
  { name: "Kokapet", growth: "+15%", avgPrice: "₹8,500/sqft", demand: "Very High" },
  { name: "Gachibowli", growth: "+12%", avgPrice: "₹9,200/sqft", demand: "High" },
  { name: "Narsingi", growth: "+18%", avgPrice: "₹7,800/sqft", demand: "Very High" },
  { name: "Kondapur", growth: "+10%", avgPrice: "₹8,900/sqft", demand: "High" },
];

const MarketIntelligence = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 relative bg-secondary/10" id="market-insights">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Market <span className="text-gradient">Intelligence</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            AI-powered insights to make smarter investment decisions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Average Price Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Hyderabad</span>
              </div>
              <h3 className="text-3xl font-bold mb-2 text-gradient">₹8,450/sqft</h3>
              <p className="text-muted-foreground mb-2">Average Price</p>
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                +12% from last year
              </div>
            </Card>
          </motion.div>

          {/* ROI Predictor Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">3Y Forecast</span>
              </div>
              <h3 className="text-3xl font-bold mb-2 text-gradient">18-22%</h3>
              <p className="text-muted-foreground mb-2">Expected ROI</p>
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                AI Confidence: 94%
              </div>
            </Card>
          </motion.div>

          {/* Hot Zones Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <h3 className="text-3xl font-bold mb-2 text-gradient">4</h3>
              <p className="text-muted-foreground mb-2">Emerging Hot Zones</p>
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                New investment opportunities
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Trending Areas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="glass-panel border-border/50 p-6">
            <h3 className="text-2xl font-bold mb-6">Trending Areas in Hyderabad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingAreas.map((area, index) => (
                <motion.div
                  key={area.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/map')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">{area.name}</h4>
                    <span className="text-primary text-sm font-bold">{area.growth}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{area.avgPrice}</p>
                  <p className="text-xs text-muted-foreground">Demand: {area.demand}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/10"
            onClick={() => navigate('/map')}
          >
            Explore Full Market Insights
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketIntelligence;
