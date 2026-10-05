import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BedDouble, CalendarRange, Users, BarChart3, Wallet, MessageSquare,
  TrendingUp, Sparkles, UserCog, Globe, MoreHorizontal, Tag, PartyPopper, Building2, CalendarDays, Target, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePartnerBusinessTypes } from "@/hooks/usePartnerBusinessTypes";
import { CATEGORY_BY_KEY } from "@/config/hospitalityCategories";

const primary = [
  { to: "/partners/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/partners/properties", label: "Properties", icon: Building2 },
  { to: "/partners/rooms", label: "Rooms & Rates", icon: BedDouble },
  { to: "/partners/inventory", label: "Calendar", icon: CalendarDays },
  { to: "/partners/reservations", label: "All Bookings", icon: CalendarRange },
  { to: "/partners/guests", label: "Guests", icon: Users },
  { to: "/partners/payouts", label: "Payments", icon: Wallet },
  { to: "/partners/inbox", label: "Reviews", icon: MessageSquare },
  { to: "/partners/analytics", label: "Analytics", icon: BarChart3 },
];

const more = [
  { to: "/partners/portfolio", label: "Account & Businesses", icon: Briefcase },
  { to: "/partners/hotel-profile", label: "Settings / Profile", icon: Building2 },
  { to: "/partners/pricing", label: "Pricing", icon: TrendingUp },
  { to: "/partners/staff", label: "Staff", icon: UserCog },
  { to: "/partners/demand", label: "Demand & Matches", icon: Target },
  { to: "/partners/rate-plans", label: "Rate Plans", icon: Tag },
  { to: "/partners/extra-services", label: "Extra Services", icon: PartyPopper },
  { to: "/partners/addons", label: "Add-ons", icon: Sparkles },
  { to: "/partners/booking-engine", label: "Booking Engine", icon: Globe },
];

export default function PartnerSubNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const moreActive = more.some((m) => pathname === m.to);
  const { inventoryLabel, modules, types, activeType, setActiveType } = usePartnerBusinessTypes();
  const primaryItems = primary.map((p) =>
    p.to === "/partners/rooms" ? { ...p, label: `${inventoryLabel} & Rates` } : p,
  );
  const moreItems = more.filter((m) =>
    m.to !== "/partners/extra-services" || modules.has("meals") || modules.has("experiences") || modules.has("rooms"),
  );
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition",
      active
        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
        : "border-border/60 text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-4">
        {types.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Your business types:</span>
            {types.length > 1 && (
              <button type="button" className={chip(activeType === "all")} onClick={() => setActiveType("all")}>
                All types
              </button>
            )}
            {types.map((t) => {
              const c = CATEGORY_BY_KEY[t];
              return (
                <button key={t} type="button" className={chip(activeType === t || types.length === 1)} onClick={() => setActiveType(t)}>
                  <span>{c?.emoji}</span>{c?.label ?? t}
                </button>
              );
            })}
          </div>
        )}
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {primaryItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition outline-none",
                moreActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem key={to} onSelect={() => nav(to)} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
}
