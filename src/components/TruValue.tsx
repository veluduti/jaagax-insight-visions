import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, Shield, Sparkles } from "lucide-react";

const TruValue = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <motion.div
          className="w-[700px] h-[700px] rounded-full blur-3xl"
          style={{ background: "var(--gradient-glow)" }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-6">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">JaagaX TruValue™</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Know Your Property's <br />
            <span className="text-gradient">Real Worth Instantly</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered property valuation with 95% accuracy. Get instant market value 
            and future appreciation predictions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Valuation Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="glass-panel border-border/50 p-8 glow-effect">
              <h3 className="text-2xl font-bold mb-6">Get Your Property Valuation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Address</label>
                  <Input 
                    placeholder="Enter full address" 
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <Select>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Area (sq ft)</label>
                  <Input 
                    type="number"
                    placeholder="e.g., 1500" 
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">BHK Configuration</label>
                  <Select>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Select BHK" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 BHK</SelectItem>
                      <SelectItem value="2">2 BHK</SelectItem>
                      <SelectItem value="3">3 BHK</SelectItem>
                      <SelectItem value="4">4+ BHK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full glow-effect mt-6" onClick={() => window.location.href = '/valuation'}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Valuation
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Features & Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Accurate Valuations</h4>
                  <p className="text-muted-foreground">
                    AI analyzes 50,000+ data points including recent sales, market trends, 
                    and neighborhood dynamics for 95% accuracy.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Future Appreciation</h4>
                  <p className="text-muted-foreground">
                    Get 1, 3, and 5-year appreciation forecasts based on infrastructure 
                    development and market momentum.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-panel border-border/50 p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Market Insights</h4>
                  <p className="text-muted-foreground">
                    Receive detailed reports on comparable properties, price per sq ft, 
                    and rental yield potential.
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-panel border-border/50 p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">95%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </Card>
              <Card className="glass-panel border-border/50 p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">50K+</div>
                <div className="text-sm text-muted-foreground">Valuations Done</div>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TruValue;
