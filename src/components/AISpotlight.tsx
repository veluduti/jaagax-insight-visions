import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Brain } from "lucide-react";

const AISpotlight = () => {
  const navigate = useNavigate();
  
  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <motion.div
          className="w-[500px] h-[500px] md:w-[600px] md:h-[600px] rounded-full blur-3xl"
          style={{ background: "var(--gradient-glow)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container mx-auto container-padding relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-panel p-lg md:p-2xl rounded-3xl text-center max-w-4xl mx-auto glow-effect"
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
            className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-lg rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow"
          >
            <Brain className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-md text-balance">
            Want to discover the best property <br className="hidden md:block" />
            <span className="text-gradient">using AI?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-lg max-w-2xl mx-auto">
            Chat with JaagaXGPT — Your intelligent real estate assistant. 
            Ask questions, get recommendations, and find your dream home in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-md">
            <Button 
              size="lg" 
              variant="premium"
              onClick={() => navigate('/ai-advisor')}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Launch AI Property Advisor
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary/50 hover:bg-primary/10 hover:border-primary"
              onClick={() => navigate('/guides')}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              See How It Works
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-sm mt-lg">
            {["Smart Recommendations", "Market Insights", "Price Prediction", "Legal Assistance"].map(
              (feature) => (
                <div
                  key={feature}
                  className="px-md py-sm rounded-full bg-secondary/50 backdrop-blur-sm text-sm font-medium border border-border/30 transition-all hover:bg-secondary/70 hover:scale-105"
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
