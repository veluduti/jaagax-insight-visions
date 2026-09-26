import { Link } from "react-router-dom";
import {
  Home, Building2, DollarSign, Hotel, BedDouble, Users, Sparkles, Landmark,
  TrendingUp, Calendar, Megaphone, LayoutGrid, ChevronRight, Briefcase,
} from "lucide-react";

const quick = [
  { label: "Buy / Rent", path: "/search", icon: Home },
  { label: "Projects", path: "/projects", icon: Building2 },
  { label: "Sell", path: "/sell-property", icon: DollarSign },
  { label: "Hotels", path: "/hotels", icon: Hotel },
  { label: "Agents", path: "/agents", icon: Users },
  { label: "AI Advisor", path: "/ai-advisor", icon: Sparkles },
  { label: "Loans", path: "/smart-financing", icon: Landmark },
  { label: "All", path: "/services", icon: LayoutGrid },
];

const more = [
  { label: "Market Index", path: "/transactions", icon: TrendingUp },
  { label: "Events", path: "/events", icon: Calendar },
  { label: "Offers", path: "/promotions", icon: Megaphone },
  { label: "Communities", path: "/communities", icon: Users },
  { label: "All Services", path: "/services", icon: LayoutGrid },
];

const Feature = ({ to, icon: Icon, title, desc, cta }: any) => (
  <Link to={to} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 active:scale-[0.98] transition-transform">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
      <Icon className="h-6 w-6" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground">{desc}</span>
    </span>
    <span className="flex items-center text-xs font-medium text-primary">{cta}<ChevronRight className="h-4 w-4" /></span>
  </Link>
);

/** Mobile-only horizontally scrollable service pills shown directly under the header. Hidden on desktop (xl+). */
export const MobileServicePills = () => (
  <section className="xl:hidden border-b border-border/40 bg-background/95 py-2.5">
    <div className="flex gap-2.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {more.map((m) => (
        <Link
          key={m.path}
          to={m.path}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm active:scale-95 transition-transform"
        >
          <m.icon className="h-4 w-4 text-primary" />
          {m.label}
        </Link>
      ))}
    </div>
  </section>
);

/** Mobile-only quick access grid shown directly below the hero. Hidden on desktop (xl+). */
export const MobileQuickAccess = () => (
  <section className="xl:hidden px-4 pt-3 pb-1">
    <div className="grid grid-cols-4 gap-2">
      {quick.map((q) => (
        <Link key={q.path} to={q.path} className="flex flex-col items-center gap-1.5 rounded-2xl p-2 active:scale-90 transition-transform">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <q.icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium text-foreground text-center leading-tight">{q.label}</span>
        </Link>
      ))}
    </div>
  </section>
);

/**
 * Mobile-only detailed service sections (Hotel Services, Property Selling, More).
 * Rendered AFTER the hero and featured properties on mobile. Hidden on desktop (xl+).
 */
export const MobileServiceSections = () => (
  <section className="xl:hidden px-4 pt-6 pb-2 space-y-5">
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hotel Services</h2>
      <Feature to="/hotels" icon={Hotel} title="Book a Hotel" desc="Verified stays with best prices" cta="Book" />
      <Feature to="/plan-visit-stay" icon={BedDouble} title="Visit + Stay" desc="Property visit with hotel stay" cta="Plan" />
    </div>

    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Property Selling</h2>
      <Feature to="/sell-property" icon={DollarSign} title="Sell Your Property" desc="AI-guided listing in minutes" cta="Start" />
      <Feature to="/hotels/partner" icon={Briefcase} title="List Your Hotel" desc="Become a JAAGA X partner" cta="Join" />
    </div>

  </section>
);

const MobileHomeServices = () => (
  <>
    <MobileQuickAccess />
    <MobileServiceSections />
  </>
);

export default MobileHomeServices;
