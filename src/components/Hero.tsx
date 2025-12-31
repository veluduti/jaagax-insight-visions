import PropertySearchBar from "./PropertySearchBar";
import { motion } from "framer-motion";
import { Building2, TrendingUp, Shield, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-cityscape.jpg";
interface HeroProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
const Hero = ({
  activeTab,
  onTabChange
}: HeroProps) => {
  const statCards = [{
    icon: Building2,
    value: "50K+",
    label: "Verified Properties"
  }, {
    icon: TrendingUp,
    value: "₹2.5L Cr",
    label: "Property Value"
  }, {
    icon: Shield,
    value: "100%",
    label: "Trust Score"
  }, {
    icon: Sparkles,
    value: "AI",
    label: "Powered Insights"
  }];
  return <div className="relative min-h-[85vh] flex items-center overflow-hidden pt-16 lg:pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${heroImage})`
      }} />
        <div className="absolute inset-0 bg-gradient-to-br from-background/98 via-background/95 to-background/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full container-padding">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-20">
            {/* Left Content */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} className="flex-1 text-center lg:text-left space-y-6">
              {/* Badge */}
              <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.2
            }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">India's First AI-Powered Real Estate Platform</span>
              </motion.div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="text-gradient">Your Dream Place</span>
                  <br />
                  <span className="text-foreground">Awaits</span>
                </h1>
              <p className="text-base sm:text-lg lg:text-xl text-foreground/90 max-w-2xl mx-auto lg:mx-0 drop-shadow-md">
                <span className="font-semibold">AI-Powered Insights.</span>{" "}
                <span className="font-semibold">100% Verified Properties.</span>{" "}
                <span className="font-semibold">Zero Hidden Costs.</span>
                <br />
                <span className="text-primary font-medium drop-shadow-sm">India's most trusted intelligent property platform</span>
              </p>
              </div>

              {/* Stats Cards - Desktop Only */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.4
            }} className="hidden lg:grid grid-cols-4 gap-4 pt-4">
                {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return <motion.div key={index} initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: 0.5 + index * 0.1
                }} className="glass-panel p-4 rounded-xl hover:shadow-glow transition-all group">
                      <Icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>;
              })}
              </motion.div>
            </motion.div>

            {/* Right Content - Search Bar */}
            <motion.div initial={{
            opacity: 0,
            x: 30
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.6,
            delay: 0.3
          }} className="flex-1 w-full max-w-2xl">
              <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
            </motion.div>
          </div>

          {/* Stats Cards - Mobile Only */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.6
        }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:hidden mt-8">
            {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return <div key={index} className="glass-panel p-3 rounded-xl text-center">
                  <Icon className="h-4 w-4 text-primary mb-1 mx-auto" />
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>;
          })}
          </motion.div>
        </div>
      </div>
    </div>;
};
export default Hero;