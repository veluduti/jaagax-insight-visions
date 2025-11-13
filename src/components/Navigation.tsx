import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileNav from "./MobileNav";
import { Sparkles, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { useState } from "react";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role: userRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Buy", path: "/map?transactionType=buy" },
    { label: "Rent", path: "/map?transactionType=rent" },
    { label: "New Projects", path: "/projects" },
    { label: "Agents", path: "/agents" },
    { label: "Communities", path: "/communities" },
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
                    className={`relative px-4 py-2 rounded-lg transition-all ${
                      isActive(link.path) 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {link.label}
                    {isActive(link.path) && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/ai-advisor")}
                className="gap-2 hover:bg-primary/10 hover:text-primary"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Advisor</span>
              </Button>

              <ThemeToggle />

              {session ? (
                <Button
                  onClick={() => {
                    if (userRole === "admin") navigate("/admin");
                    else if (userRole === "agent") navigate("/agent-dashboard");
                    else if (userRole === "builder") navigate("/builder-dashboard");
                    else navigate("/dashboard");
                  }}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
                  Sign In
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-neon flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">J</span>
              </div>
              <span className="text-lg font-bold text-gradient">JaagaX</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/ai-advisor")}
                className="hover:bg-primary/10 hover:text-primary"
              >
                <Sparkles className="h-5 w-5" />
              </Button>

              <ThemeToggle />

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col gap-4 mt-8">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive(link.path) ? "default" : "ghost"}
                          className="w-full justify-start"
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}

                    <div className="border-t border-border pt-4 mt-4">
                      {session ? (
                        <Button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            if (userRole === "admin") navigate("/admin");
                            else if (userRole === "agent") navigate("/agent-dashboard");
                            else if (userRole === "builder") navigate("/builder-dashboard");
                            else navigate("/dashboard");
                          }}
                          className="w-full gap-2"
                        >
                          <User className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate("/auth");
                          }}
                          className="w-full"
                        >
                          Sign In
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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
