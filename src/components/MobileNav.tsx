import { Home, Hotel, DollarSign, Megaphone, LayoutGrid, User, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const dashboardPathFor = (role?: string | null) =>
  role === "admin" ? "/dashboard/admin"
  : role === "country_admin" ? "/dashboard/admin/country"
  : role === "state_admin" ? "/dashboard/admin/state"
  : role === "district_admin" ? "/dashboard/admin/district"
  : role === "hotel_manager" ? "/partners/dashboard"
  : `/dashboard/${role || "customer"}`;

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/", match: ["/"] },
    { icon: Hotel, label: "Hotels", path: "/hotels", match: ["/hotels", "/plan-visit-stay"] },
    { icon: DollarSign, label: "Sell", path: "/sell-property", match: ["/sell-property"] },
    { icon: Megaphone, label: "Offers", path: "/promotions", match: ["/promotions"] },
    { icon: LayoutGrid, label: "Services", path: "/services", match: ["/services"] },
    { icon: User, label: "Profile", path: session ? "/select-profile" : "/auth", match: ["/select-profile", "/auth"] },
    {
      icon: LayoutDashboard, label: "Dashboard",
      path: session ? dashboardPathFor(role) : "/auth",
      match: ["/dashboard", "/partners/dashboard", "/admin"],
    },
  ];

  const isActive = (m: string[]) =>
    m.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));

  return (
    <>
      <div aria-hidden className="h-20 xl:hidden" />
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 xl:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <div className="grid grid-cols-7 px-1 pt-1.5 pb-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.match);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl active:scale-90 transition-transform"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-x-1 top-0.5 h-8 rounded-full bg-primary/15"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`relative h-5 w-5 mt-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`relative text-[10px] font-medium leading-none mt-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
};

export default MobileNav;
