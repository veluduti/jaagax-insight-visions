import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Navigation from "@/components/Navigation";
import {
  LayoutDashboard, Users, FileText, Wallet, Megaphone, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard/financial", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/financial/leads", label: "Leads", icon: Users },
  { to: "/dashboard/financial/applications", label: "Applications", icon: FileText },
  { to: "/dashboard/financial/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/financial/promotions", label: "Promotions", icon: Megaphone },
  { to: "/dashboard/financial/notifications", label: "Notifications", icon: Bell },
];

export default function FinancialLayout({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-amber-950/20 text-zinc-100">
      <Navigation />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
        </header>

        <nav className="flex flex-wrap gap-2 border border-amber-500/20 bg-black/40 backdrop-blur-md rounded-xl p-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end as any}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold shadow-lg shadow-amber-500/30"
                    : "text-zinc-300 hover:bg-amber-500/10 hover:text-amber-200"
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
