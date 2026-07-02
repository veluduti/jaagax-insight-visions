import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BedDouble, CalendarRange, Users, BarChart3, Wallet, MessageSquare,
  TrendingUp, Sparkles, UserCog, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/partners/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/partners/rooms", label: "Rooms & Rates", icon: BedDouble },
  { to: "/partners/pricing", label: "Pricing & Promos", icon: TrendingUp },
  { to: "/partners/addons", label: "Add-ons", icon: Sparkles },
  { to: "/partners/reservations", label: "Reservations", icon: CalendarRange },
  { to: "/partners/guests", label: "Guests", icon: Users },
  { to: "/partners/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/partners/payouts", label: "Payouts", icon: Wallet },
  { to: "/partners/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/partners/staff", label: "Staff", icon: UserCog },
  { to: "/partners/booking-engine", label: "Booking Engine", icon: Globe },
];

export default function PartnerSubNav() {
  return (
    <div className="border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-4">
        <nav className="flex gap-1 overflow-x-auto py-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition",
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
        </nav>
      </div>
    </div>
  );
}
