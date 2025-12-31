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
    <section className="section-spacing relative bg-secondary/10" id="market-insights">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Market <span className="text-gradient">Intelligence</span>
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            AI-powered insights to make smarter investment decisions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md lg:gap-lg mb-xl">
          {/* Average Price Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="card-hover p-md">
              <div className="flex items-start justify-between mb-md">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Hyderabad</span>
              </div>
              <h3 className="text-3xl font-bold mb-sm text-gradient">₹8,450/sqft</h3>
              <p className="text-muted-foreground mb-sm">Average Price</p>
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
            <Card className="card-hover p-md">
              <div className="flex items-start justify-between mb-md">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">3Y Forecast</span>
              </div>
              <h3 className="text-3xl font-bold mb-sm text-gradient">18-22%</h3>
              <p className="text-muted-foreground mb-sm">Expected ROI</p>
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
            <Card className="card-hover p-md">
              <div className="flex items-start justify-between mb-md">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                  <MapPin className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <h3 className="text-3xl font-bold mb-sm text-gradient">4</h3>
              <p className="text-muted-foreground mb-sm">Emerging Hot Zones</p>
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
          <Card className="card-base p-md">
            <h3 className="text-xl md:text-2xl font-bold mb-lg">Trending Areas in Hyderabad</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
              {trendingAreas.map((area, index) => (
                <motion.div
                  key={area.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="p-md rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all cursor-pointer hover-lift"
                  onClick={() => navigate('/map')}
                >
                  <div className="flex items-center justify-between mb-sm">
                    <h4 className="font-semibold">{area.name}</h4>
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
          transition={{ duration: 0.6 }}
          className="text-center mt-lg"
        >
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/10 hover:border-primary"
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
