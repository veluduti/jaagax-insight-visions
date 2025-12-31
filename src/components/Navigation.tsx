import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileNav from "./MobileNav";
import SidebarMenu from "./SidebarMenu";
import { NotificationBell } from "./notifications/NotificationBell";
import { Menu, Leaf, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role } = useAuth();
  const [naturalLivingEnabled, setNaturalLivingEnabled] = useState(false);

  useEffect(() => {
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

  const navLinks = [
    { label: "Find My Agent", path: "/agents" },
    { label: "Sell Property", path: "/sell-property" },
    { label: "Communities", path: "/communities" },
    { label: "Transactions", path: "/transactions" },
    { label: "New Projects", path: "/projects" },
    { label: "Events", path: "/events" },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="container-padding py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gradient">JaagaX</span>
                <span className="text-xs text-muted-foreground">Intelligent Realty</span>
              </div>
            </Link>

            {/* Center Nav Links */}
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path}>
                  <Button
                    variant="ghost"
                    className={`relative px-3 py-2 text-sm font-medium transition-all ${
                      isActive(link.path) 
                        ? "text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              
              {/* Natural Living Tab */}
              <Link to="/natural-living">
                <Button
                  variant="ghost"
                  className={`relative px-3 py-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive('/natural-living') 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Leaf className="h-4 w-4 text-emerald-500" />
                  Natural Living
                  {!naturalLivingEnabled && (
                    <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Soon
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Get Guidance Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ai-advisor')}
                className="text-sm text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Sparkles className="h-4 w-4 mr-1.5 text-primary" />
                Get Guidance
              </Button>
              
              <ThemeToggle />
              {session && <NotificationBell />}
              <SidebarMenu />

              {session ? (
                <Button 
                  onClick={() => navigate(`/dashboard/${role || 'buyer'}`)} 
                  variant="default"
                  size="sm"
                  className="text-sm"
                >
                  Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate("/auth")} 
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  Sign up or Log in
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50"
      >
        <div className="container-padding py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-gradient">JaagaX</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {session && <NotificationBell />}
              <SidebarMenu />
              
              {session ? (
                <Button 
                  onClick={() => navigate(`/dashboard/${role || 'buyer'}`)} 
                  variant="ghost" 
                  size="sm"
                >
                  Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate("/auth")} 
                  variant="ghost" 
                  size="sm"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Nav - Only show on mobile */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </>
  );
};

export default Navigation;
