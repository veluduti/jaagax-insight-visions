import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileNav from "./MobileNav";
import SidebarMenu from "./SidebarMenu";
import { NotificationBell } from "./notifications/NotificationBell";
import {
  Leaf,
  Sparkles,
  Home,
  Building2,
  Compass,
  ChevronDown,
  Users,
  MapPin,
  Calendar,
  Hotel,
  TrendingUp,
  DollarSign,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { canSee } from "@/lib/roleAccess";
import ProfileSwitcher from "@/components/profile/ProfileSwitcher";
import LocationPill from "@/components/location/LocationPill";

const Navigation = () => {
  // Navigation component
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role } = useAuth();
  const [naturalLivingEnabled, setNaturalLivingEnabled] = useState(false);

  useEffect(() => {
    const fetchFeatureFlag = async () => {
      try {
        const { data } = await (supabase.from("feature_flags" as any).select("enabled") as any)
          .eq("flag_name", "natural_living_enabled")
          .maybeSingle();

        if (data) {
          setNaturalLivingEnabled(data.enabled ?? false);
        }
      } catch (error) {
        console.log("Feature flags not available");
      }
    };
    fetchFeatureFlag();
  }, []);

  const allPropertiesItems: Array<{ key: string; label: string; path: string; icon: any; description: string }> = [
    {
      key: "buyRent",
      label: "Buy / Rent Properties",
      path: "/search",
      icon: Home,
      description: "Browse available properties",
    },
    {
      key: "newProjects",
      label: "New Projects",
      path: "/projects",
      icon: Building2,
      description: "Explore upcoming developments",
    },
    {
      key: "sellProperty",
      label: "Sell Your Property",
      path: "/sell-property",
      icon: DollarSign,
      description: "List your property with us",
    },
  ];

  const allExploreItems: Array<{ key: string; label: string; path: string; icon: any; description: string }> = [
    {
      key: "communities",
      label: "Communities",
      path: "/communities",
      icon: MapPin,
      description: "Discover neighborhoods",
    },
    { key: "agents", label: "Find My Agent", path: "/agents", icon: Users, description: "Connect with trusted agents" },
    { key: "always", label: "Events", path: "/events", icon: Calendar, description: "Local community events" },
    {
      key: "marketIndex",
      label: "Market Index",
      path: "/transactions",
      icon: TrendingUp,
      description: "Real estate market insights",
    },
    { key: "always", label: "Promotions", path: "/promotions", icon: Sparkles, description: "Special offers & deals" },
    { key: "always", label: "Innovation Hub", path: "/innovation", icon: Zap, description: "AI-powered features" },
  ];

  const propertiesItems = allPropertiesItems.filter((i) => i.key === "always" || canSee(role, i.key as any));
  const exploreItems = allExploreItems.filter((i) => i.key === "always" || canSee(role, i.key as any));

  const isActive = (path: string) => {
    if (path.includes("?")) {
      const [pathname, search] = path.split("?");
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const isPropertiesActive = propertiesItems.some((item) => isActive(item.path));
  const isExploreActive = exploreItems.some((item) => isActive(item.path));

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="hidden xl:block fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="container-padding py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-0">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="JAAGA X - Home">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                JAAGA X
              </span>
            </Link>

            {/* Center Nav Links - Smart Grouped */}
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* Properties Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "bg-transparent h-auto px-3 py-2 text-sm font-medium",
                      isPropertiesActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Building2 className="h-4 w-4 mr-1.5" />
                    Properties
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      {propertiesItems.map((item) => (
                        <li key={item.path}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.path}
                              className={cn(
                                "flex items-start gap-3 rounded-md p-3 hover:bg-accent transition-colors",
                                isActive(item.path) && "bg-accent",
                              )}
                            >
                              <item.icon className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-foreground">{item.label}</div>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Explore Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "bg-transparent h-auto px-3 py-2 text-sm font-medium",
                      isExploreActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Compass className="h-4 w-4 mr-1.5" />
                    Explore
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2">
                      {exploreItems.map((item) => (
                        <li key={item.path}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.path}
                              className={cn(
                                "flex items-start gap-3 rounded-md p-3 hover:bg-accent transition-colors",
                                isActive(item.path) && "bg-accent",
                              )}
                            >
                              <item.icon className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-foreground">{item.label}</div>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Hotels - Direct Link */}
                <NavigationMenuItem>
                  <Link to="/hotels">
                    <Button
                      variant="ghost"
                      className={cn(
                        "px-3 py-2 text-sm font-medium h-auto",
                        isActive("/hotels") ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Hotel className="h-4 w-4 mr-1.5" />
                      Hotels
                    </Button>
                  </Link>
                </NavigationMenuItem>

                {/* Natural Living - Direct Link */}
                <NavigationMenuItem>
                  <Link to="/natural-living">
                    <Button
                      variant="ghost"
                      className={cn(
                        "px-3 py-2 text-sm font-medium h-auto flex items-center gap-1.5",
                        isActive("/natural-living") ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Leaf className="h-4 w-4 text-emerald-500" />
                      Natural Living
                      {!naturalLivingEnabled && (
                        <Badge
                          variant="outline"
                          className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        >
                          Soon
                        </Badge>
                      )}
                    </Button>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <LocationPill />
              {/* Get Guidance Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/ai-advisor")}
                className="text-sm text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Sparkles className="h-4 w-4 sm:mr-1.5 text-primary" />
                <span className="hidden 2xl:inline">Get Guidance</span>
              </Button>

              <ThemeToggle />
              {session && <NotificationBell />}
              <SidebarMenu />

              {session ? (
                <>
                  <ProfileSwitcher />
                  <Button
                    onClick={() => navigate(`/dashboard/${role || "buyer"}`)}
                    variant="default"
                    size="sm"
                    className="text-sm"
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/auth")} variant="outline" size="sm" className="text-sm">
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
        className="xl:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50"
      >
        <div className="container-padding py-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="JAAGA X - Home">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                JAAGA X
              </span>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
              <LocationPill />
              <ThemeToggle />
              {session && <NotificationBell />}
              <SidebarMenu />

              {session ? (
                <>
                  <ProfileSwitcher />
                  <Button onClick={() => navigate(`/dashboard/${role || "buyer"}`)} variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/auth")} variant="ghost" size="sm">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Spacer to offset fixed navbar so content isn't hidden underneath */}
      <div aria-hidden className="h-16 xl:h-[68px]" />

      {/* Mobile Bottom Nav - hidden on xl+ */}
      <div className="xl:hidden">
        <MobileNav />
      </div>
    </>
  );
};

export default Navigation;
