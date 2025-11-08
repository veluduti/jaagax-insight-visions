import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <motion.a
    href={href}
    className="text-foreground hover:text-primary transition-colors font-medium relative group"
    whileHover={{ y: -2 }}
  >
    {children}
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
  </motion.a>
);

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass-panel shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="/"
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
              <span className="text-2xl font-bold text-primary-foreground">J</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">JaagaX</h1>
              <p className="text-xs text-muted-foreground">Intelligent Realty</p>
            </div>
          </motion.a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <NavItem href="#find-agent">Find My Agent</NavItem>
            <NavItem href="#sell-property">Sell My Property</NavItem>
            <NavItem href="/projects">New Projects</NavItem>
            <NavItem href="/transactions">Transactions</NavItem>
            <NavItem href="#market-insights">Market Insights</NavItem>
            <NavItem href="#ai-advisor">AI Advisor</NavItem>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="hidden md:flex border-primary/50 hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Try JaagaXGPT
            </Button>
            <Button 
              variant="default" 
              className="glow-effect"
              onClick={() => window.location.href = '/auth'}
            >
              <User className="h-4 w-4 mr-2" />
              Sign up / Log in
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
