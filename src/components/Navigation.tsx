import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Search, Menu, User } from "lucide-react";

const Navigation = () => {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass-panel"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-effect">
              <span className="text-2xl font-bold text-primary-foreground">J</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">JaagaX</h1>
              <p className="text-xs text-muted-foreground">Intelligent Realty</p>
            </div>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-foreground hover:text-primary transition-colors">Buy</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">Rent</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">Communities</a>
            <a href="#" className="text-foreground hover:text-primary transition-colors">AI Tools</a>
          </div>

          {/* Search & Auth */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-5 w-5" />
            </Button>
            <Button 
              variant="default" 
              className="glow-effect"
              onClick={() => window.location.href = '/auth'}
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
