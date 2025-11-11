import { Home, Search, Users, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/projects" },
    { icon: Users, label: "Agents", path: "/agents" },
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
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-panel border-t border-border/50 safe-area-inset-bottom"
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all"
            >
              <div
                className={`relative transition-all ${
                  active ? "scale-110" : ""
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
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
