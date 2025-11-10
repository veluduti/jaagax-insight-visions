import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Brain } from "lucide-react";

const AISpotlight = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <motion.div
          className="w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: "var(--gradient-glow)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-panel p-12 md:p-16 rounded-3xl text-center max-w-4xl mx-auto glow-effect"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect"
          >
            <Brain className="h-10 w-10 text-primary-foreground" />
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Want to discover the best property <br />
            <span className="text-gradient">using AI?</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Chat with JaagaXGPT — Your intelligent real estate assistant. 
            Ask questions, get recommendations, and find your dream home in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="glow-effect group"
              onClick={() => navigate('/ai-advisor')}
            >
              <Sparkles className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
              Launch AI Property Advisor
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => navigate('/guides')}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              See How It Works
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            {["Smart Recommendations", "Market Insights", "Price Prediction", "Legal Assistance"].map(
              (feature) => (
                <div
                  key={feature}
                  className="px-4 py-2 rounded-full bg-secondary/50 text-sm font-medium"
                >
                  {feature}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AISpotlight;
