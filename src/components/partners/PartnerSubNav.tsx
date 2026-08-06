import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BedDouble, CalendarRange, Users, BarChart3, Wallet, MessageSquare,
  TrendingUp, Sparkles, UserCog, Globe, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primary = [
  { to: "/partners/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/partners/rooms", label: "Rooms & Rates", icon: BedDouble },
  { to: "/partners/reservations", label: "Reservations", icon: CalendarRange },
  { to: "/partners/guests", label: "Guests", icon: Users },
  { to: "/partners/pricing", label: "Pricing", icon: TrendingUp },
  { to: "/partners/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/partners/staff", label: "Staff", icon: UserCog },
];

const more = [
  { to: "/partners/addons", label: "Add-ons", icon: Sparkles },
  { to: "/partners/payouts", label: "Payouts", icon: Wallet },
  { to: "/partners/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/partners/booking-engine", label: "Booking Engine", icon: Globe },
];

export default function PartnerSubNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const moreActive = more.some((m) => pathname === m.to);

  return (
    <div className="border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {primary.map(({ to, label, icon: Icon }) => (
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
              {more.map(({ to, label, icon: Icon }) => (
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
