import { Home, Search, Users, Sparkles, User, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [naturalLivingEnabled, setNaturalLivingEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    
    // Fetch feature flag
    const fetchFeatureFlag = async () => {
      const { data } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_name', 'natural_living_enabled')
        .single();
      
      if (data) {
        setNaturalLivingEnabled(data.enabled);
      }
    };
    fetchFeatureFlag();
  }, []);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/projects" },
    { icon: Leaf, label: "Natural", path: "/natural-living", showBadge: !naturalLivingEnabled },
    { icon: Sparkles, label: "AI", path: "/ai-advisor" },
    { 
      icon: User, 
      label: "Profile", 
      path: user ? "/dashboard" : "/auth" 
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-panel border-t border-border/50 safe-area-inset-bottom"
    >
      <div className="flex items-center justify-around px-xs py-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const showBadge = 'showBadge' in item && item.showBadge;
          
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-md py-sm rounded-lg transition-all hover:bg-accent/50 relative"
            >
              <div
                className={`relative transition-all duration-200 ${
                  active ? "scale-110" : "scale-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    item.label === "Natural" ? "text-emerald-500" : 
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  item.label === "Natural" ? "text-emerald-500" :
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MobileNav;
