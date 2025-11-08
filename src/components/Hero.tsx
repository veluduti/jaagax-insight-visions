import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-cityscape.jpg";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Hyderabad Skyline" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      </div>

      {/* Floating Orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--gradient-glow)" }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "var(--gradient-glow)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm">AI-Powered Real Estate Intelligence</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Find Your Perfect
            <br />
            <span className="text-gradient">Jaaga in Hyderabad</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            Experience the future of real estate with AI-powered insights, 3D visualization, 
            and verified properties across Hyderabad & Vijayawada
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-3 rounded-2xl max-w-3xl mx-auto mb-8 glow-effect"
          >
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary">
                <MapPin className="h-5 w-5 text-primary" />
                <Input 
                  placeholder="Enter locality, project, or community" 
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button size="lg" className="glow-effect">
                <Search className="h-5 w-5 mr-2" />
                Search Properties
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { label: "Verified Properties", value: "10,000+" },
              { label: "Trusted Builders", value: "250+" },
              { label: "Communities", value: "50+" },
              { label: "AI Accuracy", value: "98%" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="glass-panel p-4 rounded-xl text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-gradient mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-primary flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
