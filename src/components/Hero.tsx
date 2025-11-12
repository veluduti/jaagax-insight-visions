import { motion } from "framer-motion";
import PropertySearchBar from "@/components/PropertySearchBar";
import heroImage from "@/assets/hero-cityscape.jpg";

interface HeroProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Hero = ({ activeTab, onTabChange }: HeroProps) => {

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Hyderabad & Vijayawada Skyline" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div 
          className="absolute inset-0" 
          style={{ background: "var(--gradient-hero)" }}
        />
      </div>

      {/* Floating Orbs - Ambient Background Animation */}
      <motion.div
        className="absolute top-20 left-10 w-80 h-80 md:w-96 md:h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
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
      <motion.div
        className="absolute bottom-20 right-10 w-80 h-80 md:w-96 md:h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "var(--gradient-orange)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 container-padding w-full max-w-7xl mx-auto py-xl md:py-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-md leading-tight text-balance"
          >
            Real homes live here
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground mb-lg max-w-2xl mx-auto"
          >
            Real Data. Real Brokers. Real Properties.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
