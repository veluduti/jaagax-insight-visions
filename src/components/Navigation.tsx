import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileNav from "./MobileNav";
import SidebarMenu from "./SidebarMenu";
import { NotificationBell } from "./notifications/NotificationBell";
import {
  Sparkles,
  Home,
  HousePlus,
  Building2,
  Compass,
  Users,
  MapPin,
  Calendar,
  Hotel,
  TrendingUp,
  DollarSign,
  Zap,
  ArrowLeft,
  Plane,
  Heart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
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
import LocationPill from "@/components/location/LocationPill";
import jaagaxLogo from "@/assets/jaagax-logo.png";

const Navigation = ({ hotelDiscovery = false, onHotelWishlist }: { hotelDiscovery?: boolean; onHotelWishlist?: () => void }) => {
  // Navigation component
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role } = useAuth();
  const isAdminRole =
    role === "admin" || role === "country_admin" || role === "state_admin" || role === "district_admin";
  const dashboardPath =
    role === "admin"
      ? "/dashboard/admin"
      : role === "country_admin"
        ? "/dashboard/admin/country"
        : role === "state_admin"
          ? "/dashboard/admin/state"
          : role === "district_admin"
            ? "/dashboard/admin/district"
            : role === "hotel_manager"
              ? "/partners/dashboard"
              : `/dashboard/${role || "buyer"}`;

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
    { key: "always", label: "Smart Stays", path: "/smart-stays", icon: MapPin, description: "Multi-city trips, one payment" },
    {
      key: "marketIndex",
      label: "Market Index",
      path: "/transactions",
      icon: TrendingUp,
      description: "Real estate market insights",
    },
    {
      key: "always",
      label: "Smart Financing",
      path: "/smart-financing",
      icon: DollarSign,
      description: "Home loans & EMI planning",
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

const navPill = (active: boolean) => cn("h-10 gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors", active ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "bg-transparent text-foreground hover:bg-muted hover:text-foreground");
  // Pages opened in a new tab have no in-app history, so fall back to Home.
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate("/"));
  const isDashboardRoute = ["/dashboard", "/admin", "/partners", "/agent", "/builder"].some((p) =>
    location.pathname.startsWith(p),
  );
  const isPropertiesActive = propertiesItems.some((item) => isActive(item.path));
  const isExploreActive = exploreItems.some((item) => isActive(item.path));

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`hidden xl:block fixed top-0 left-0 right-0 z-50 ${hotelDiscovery ? "bg-card" : "bg-background/80 backdrop-blur-xl"} border-b border-border/50`}
      >
        <div className="container-padding py-3">
          <div className={`mx-auto flex items-center justify-between min-w-0 ${hotelDiscovery ? "max-w-[1600px] gap-3 [&_button]:text-xs [&_button]:px-2 [&_button]:gap-1 [&_a]:text-xs [&_a]:px-2 [&_a]:gap-1 [&_ul]:gap-1 [&_a]:shrink-0" : "max-w-7xl 3xl:max-w-[1680px] gap-4"}`}>
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
            <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="JAAGA X - Home">
              <img
                src={jaagaxLogo}
                alt="JAAGA X"
                className={`${hotelDiscovery ? "h-10 max-h-10" : "h-14 max-h-14"} w-auto object-contain shrink-0`}
                loading="lazy"
                decoding="async"
              />
            </Link>
            </div>

            {/* Center Nav Links - Smart Grouped */}
            <NavigationMenu className="[&>div:last-child]:left-auto [&>div:last-child]:right-0">
              <NavigationMenuList className="gap-2">
                {
                  <>
                    {/* Properties (Sell Your Property) - Direct Link (all roles) */}
                    <NavigationMenuItem>
                      <NavigationMenuLink asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className={navPill(isActive("/sell-property"))}
                        >
                          <Link to="/sell-property">
                            <HousePlus className="!h-[18px] !w-[18px]" />
                            Post Jaaga
                          </Link>
                        </Button>
                      </NavigationMenuLink>
                    </NavigationMenuItem>

                    {/* Stays (Hotels) - Direct Link */}
                    <NavigationMenuItem>
                      <Link to="/hotels">
                        <Button
                          variant="ghost"
                          className={navPill(isActive("/hotels"))}
                        >
                          <Hotel className="h-[18px] w-[18px]" />
                          Jaaga Stays
                        </Button>
                      </Link>
                    </NavigationMenuItem>

                    {/* Smart Stays - Direct Link */}
                    <NavigationMenuItem>
                      <Link to="/smart-stays">
                        <Button
                          variant="ghost"
                          className={navPill(isActive("/smart-stays"))}
                        >
                          <Sparkles className="h-[18px] w-[18px]" />
                          Smart Stays
                        </Button>
                      </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger
                        className={navPill(isExploreActive)}
                      >
                        <Compass className="h-[18px] w-[18px] mr-2" />
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
                    {hotelDiscovery && <><NavigationMenuItem><Button asChild variant="ghost" className={navPill(isActive("/my-trips"))}><Link to="/my-trips"><Plane className="h-4 w-4" />Travel</Link></Button></NavigationMenuItem><NavigationMenuItem><Button asChild variant="ghost" className={navPill(isActive("/transactions"))}><Link to="/transactions"><TrendingUp className="h-4 w-4" />Investment</Link></Button></NavigationMenuItem></>}
                  </>
                }
              </NavigationMenuList>
            </NavigationMenu>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <LocationPill />
              {hotelDiscovery && <Button variant="ghost" size="icon" aria-label="Saved stays" title="Saved stays" onClick={onHotelWishlist}><Heart className="h-5 w-5" /></Button>}
              {/* Get Guidance Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/ai-advisor")}
                className="text-[15px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Sparkles className="h-[18px] w-[18px] sm:mr-2 text-primary" />
                <span className="hidden 2xl:inline">Get Guidance</span>
              </Button>

              {!hotelDiscovery && <ThemeToggle />}
              {session && <NotificationBell />}
              <SidebarMenu />

              {hotelDiscovery && <Button asChild size="sm"><Link to="/sell-property"><HousePlus className="h-4 w-4" />Post Property</Link></Button>}
              {session ? (
                <>
                  <Button
                    onClick={() => navigate(dashboardPath)}
                    variant="default"
                    size="sm"
                    className="text-[15px] px-5"
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate("/auth")} variant="ghost" size="sm" className="text-[15px]">
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/register")}
                    variant="default"
                    size="sm"
                    className="text-[15px] px-5"
                  >
                    Register
                  </Button>
                </>
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
        <div className="container-padding py-3 max-[399px]:px-2">
          <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-0 h-10">
            <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 shrink">
              <Link to="/" className="flex items-center min-w-0 shrink" aria-label="JAAGA X - Home">
                <img
                  src={jaagaxLogo}
                  alt="JAAGA X"
                  className="h-9 sm:h-11 w-auto max-w-full max-h-11 object-contain object-left"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0 min-w-0">
              <LocationPill mobileCompact className="max-w-[112px] sm:max-w-[180px]" />
              <div className="hidden sm:block">
                {!hotelDiscovery && <ThemeToggle />}
              </div>
              {session && <NotificationBell />}
              <SidebarMenu />

              {session ? (
                <>
                  <Button
                    onClick={() => navigate(dashboardPath)}
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate("/auth")} variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/register")}
                    variant="default"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Spacer to offset fixed navbar so content isn't hidden underneath */}
      <div aria-hidden className="h-16 xl:h-[68px]" />

      {/* Back symbol — hidden on dashboards; left edge of the content, level with the page heading */}
      {location.pathname !== "/" && !isDashboardRoute && !hotelDiscovery && (
        <div className="container-padding mt-4">
          <div className="max-w-7xl 3xl:max-w-[1680px] mx-auto flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              aria-label="Go back"
              className="h-8 w-8 rounded-full -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav - hidden on xl+ */}
      <div className="xl:hidden">
        <MobileNav />
      </div>
    </>
  );
};

export default Navigation;
