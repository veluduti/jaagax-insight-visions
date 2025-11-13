import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileNav from "./MobileNav";
import SidebarMenu from "./SidebarMenu";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role: userRole } = useAuth();

  const navLinks = [
    { label: "Find My Agent", path: "/agents" },
    { label: "Sell Property", path: "/sell-property", badge: "NEW" },
    { label: "Transactions", path: "/transactions" },
    { label: "New Projects", path: "/projects" },
    { label: "Events", path: "/events", badge: "NEW" },
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-neon flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-xl font-bold text-primary-foreground">J</span>
              </div>
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
                    <span className="flex items-center gap-1.5">
                      {link.label}
                      {link.badge && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          {link.badge}
                        </Badge>
                      )}
                    </span>
                  </Button>
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <SidebarMenu />

              <Button 
                onClick={() => navigate("/auth")} 
                variant="outline"
                size="sm"
                className="text-sm"
              >
                Sign up or Log in
              </Button>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-neon flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">J</span>
              </div>
              <span className="text-lg font-bold text-gradient">JaagaX</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SidebarMenu />
              
              <Button onClick={() => navigate("/auth")} variant="ghost" size="sm">
                Sign In
              </Button>
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
