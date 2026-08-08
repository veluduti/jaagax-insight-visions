import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Navigation from "@/components/Navigation";
import {
  LayoutDashboard, Users, FileText, Wallet, Megaphone, Bell, Settings, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard/financial", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/financial/leads", label: "Leads", icon: Users },
  { to: "/dashboard/financial/applications", label: "Applications", icon: FileText },
  { to: "/dashboard/financial/customers", label: "Customers", icon: Users },
  { to: "/dashboard/financial/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard/financial/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/financial/promotions", label: "Promotions", icon: Megaphone },
  { to: "/dashboard/financial/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/financial/settings", label: "Settings", icon: Settings },
];

export default function FinancialLayout({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </header>

        <nav className="flex flex-wrap gap-2 border border-border bg-card rounded-xl p-2 shadow-sm">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end as any}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
