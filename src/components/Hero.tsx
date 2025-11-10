import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PropertySearchBar from "@/components/PropertySearchBar";
import heroImage from "@/assets/hero-cityscape.jpg";
import { Sparkles } from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: "Properties", path: "/map" },
    { label: "New Projects", path: "/projects" },
    { label: "Transactions", path: "/transactions" },
    { label: "TruValue™", path: "/property-valuation" },
    { label: "Agents", path: "/agents" },
  ];

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Hyderabad & Vijayawada Skyline" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/95" />
      </div>

      {/* Floating Orbs */}
      <motion.div
        className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl opacity-20"
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
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "var(--gradient-orange)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-6xl mx-auto"
        >
          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-6 mb-12"
          >
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="text-base md:text-lg font-medium text-foreground/80 hover:text-primary transition-colors relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight"
          >
            Real homes live here
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-muted-foreground mb-10"
          >
            Real Data. Real Brokers. Real Properties.
          </motion.p>

          {/* Search Bar */}
          <PropertySearchBar />

          {/* AI Callout */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={() => navigate('/map')}
            className="mt-6 inline-flex items-center gap-2 text-sm md:text-base text-primary hover:text-primary/80 transition-colors group"
          >
            <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-medium">
              Want to find out more about Indian real estate using AI?
            </span>
            <span className="font-bold group-hover:translate-x-1 transition-transform">
              Try JaagaXGPT →
            </span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
