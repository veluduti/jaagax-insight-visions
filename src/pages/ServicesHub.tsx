import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Home, Building2, DollarSign, Hotel, MapPin, Users, Calendar, TrendingUp, Sparkles, Zap,
  Search, Map, Film, Scale, Calculator, ShieldCheck, BedDouble, Briefcase, Landmark,
  LayoutDashboard, UserCog, ClipboardCheck, Trophy, BookOpen, HelpCircle, Phone, Megaphone, Star, Search as SearchIcon,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

type Item = { label: string; path: string; icon: any; desc?: string };
type Group = { title: string; items: Item[] };

const publicGroups: Group[] = [
  {
    title: "Property",
    items: [
      { label: "Buy / Rent", path: "/search", icon: Home },
      { label: "New Projects", path: "/projects", icon: Building2 },
      { label: "Sell Property", path: "/sell-property", icon: DollarSign },
      { label: "Featured", path: "/featured-properties", icon: Star },
      { label: "Map Search", path: "/map", icon: Map },
      { label: "Property Reels", path: "/reels", icon: Film },
      { label: "Compare", path: "/compare", icon: Scale },
      { label: "Valuation", path: "/valuation", icon: Calculator },
    ],
  },
  {
    title: "Hotels & Stays",
    items: [
      { label: "Book Hotels", path: "/hotels", icon: Hotel },
      { label: "Visit + Stay", path: "/plan-visit-stay", icon: BedDouble },
      { label: "List Your Hotel", path: "/hotels/partner", icon: Briefcase },
      { label: "Partner Login", path: "/partners/login", icon: UserCog },
    ],
  },
  {
    title: "Agents & Builders",
    items: [
      { label: "Find My Agent", path: "/agents", icon: Users },
      { label: "Leaderboard", path: "/agents/leaderboard", icon: Trophy },
      { label: "Become Agent", path: "/agent/register", icon: ClipboardCheck },
      { label: "Builder Profile", path: "/add-builder-profile", icon: Building2 },
      { label: "Add Project", path: "/add-project", icon: Building2 },
      { label: "Trust Score", path: "/trust-score", icon: ShieldCheck },
    ],
  },
  {
    title: "Finance & Insights",
    items: [
      { label: "Smart Financing", path: "/smart-financing", icon: Landmark },
      { label: "Loan Partner", path: "/financial/register", icon: DollarSign },
      { label: "Market Index", path: "/transactions", icon: TrendingUp },
      { label: "Communities", path: "/communities", icon: MapPin },
    ],
  },
  {
    title: "AI & Community",
    items: [
      { label: "AI Advisor", path: "/ai-advisor", icon: Sparkles },
      { label: "Innovation Hub", path: "/innovation", icon: Zap },
      { label: "Events", path: "/events", icon: Calendar },
      { label: "Promotions", path: "/promotions", icon: Megaphone },
      { label: "Advertise", path: "/advertise", icon: Megaphone },
      { label: "Natural Living", path: "/natural-living", icon: MapPin },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "How It Works", path: "/how-it-works", icon: BookOpen },
      { label: "Guides", path: "/guides", icon: BookOpen },
      { label: "Help Center", path: "/help", icon: HelpCircle },
      { label: "Contact", path: "/contact", icon: Phone },
    ],
  },
];

const dashboardsFor = (role: string | null | undefined): Item[] => {
  const d: Item[] = [];
  const r = role || "";
  if (["admin", "country_admin", "state_admin", "district_admin"].includes(r)) {
    if (r === "admin") d.push({ label: "Super Admin", path: "/dashboard/admin", icon: LayoutDashboard });
    if (r === "country_admin") d.push({ label: "Country Admin", path: "/dashboard/admin/country", icon: LayoutDashboard });
    if (r === "state_admin") d.push({ label: "State Admin", path: "/dashboard/admin/state", icon: LayoutDashboard });
    if (r === "district_admin") d.push({ label: "District Admin", path: "/dashboard/admin/district", icon: LayoutDashboard });
    d.push(
      { label: "Properties Pipeline", path: "/admin/properties-pipeline", icon: ClipboardCheck },
      { label: "KYC Verifications", path: "/admin/kyc-verifications", icon: ShieldCheck },
      { label: "Land Registrations", path: "/admin/land-registrations", icon: Landmark },
      { label: "Leads CRM", path: "/admin/leads", icon: Users },
      { label: "Visit Analytics", path: "/visit/analytics", icon: TrendingUp },
    );
    if (r === "admin") d.push({ label: "Pricing", path: "/dashboard/admin/pricing", icon: DollarSign }, { label: "Field Mgmt", path: "/dashboard/admin/frm", icon: Users });
  } else if (r === "agent") {
    d.push(
      { label: "Agent Dashboard", path: "/dashboard/agent", icon: LayoutDashboard },
      { label: "Assigned", path: "/dashboard/agent/assigned", icon: ClipboardCheck },
      { label: "Verifications", path: "/dashboard/agent/verifications", icon: ShieldCheck },
      { label: "Visits", path: "/dashboard/agent/visits", icon: Calendar },
      { label: "Add Property", path: "/dashboard/agent/add-property", icon: Home },
    );
  } else if (r === "hotel_manager" || r === "hotel") {
    d.push(
      { label: "Hotel Dashboard", path: "/partners/dashboard", icon: LayoutDashboard },
      { label: "Reservations", path: "/partners/reservations", icon: Calendar },
      { label: "Rooms", path: "/partners/rooms", icon: BedDouble },
      { label: "Pricing", path: "/partners/pricing", icon: DollarSign },
      { label: "Rate Plans", path: "/partners/rate-plans", icon: Calculator },
      { label: "Add-ons", path: "/partners/addons", icon: Sparkles },
      { label: "Extra Services", path: "/partners/extra-services", icon: Star },
      { label: "Guests", path: "/partners/guests", icon: Users },
      { label: "Analytics", path: "/partners/analytics", icon: TrendingUp },
      { label: "Payouts", path: "/partners/payouts", icon: Landmark },
      { label: "Inbox", path: "/partners/inbox", icon: Phone },
      { label: "Staff", path: "/partners/staff", icon: UserCog },
      { label: "Hotel Profile", path: "/partners/hotel-profile", icon: Hotel },
    );
  } else if (r === "financial" || r === "financial_provider") {
    d.push(
      { label: "Finance Dashboard", path: "/dashboard/financial", icon: LayoutDashboard },
      { label: "Applications", path: "/dashboard/financial/applications", icon: ClipboardCheck },
      { label: "Leads", path: "/dashboard/financial/leads", icon: Users },
      { label: "Customers", path: "/dashboard/financial/customers", icon: Users },
      { label: "Reports", path: "/dashboard/financial/reports", icon: TrendingUp },
      { label: "Promotions", path: "/dashboard/financial/promotions", icon: Megaphone },
    );
  } else {
    d.push(
      { label: "My Dashboard", path: "/dashboard/customer", icon: LayoutDashboard },
      { label: "My Visits", path: "/visit/manage", icon: Calendar },
      { label: "Builder Projects", path: "/builder/projects", icon: Building2 },
      { label: "Builder CRM", path: "/builder/crm", icon: Users },
      { label: "Switch Profile", path: "/select-profile", icon: UserCog },
    );
  }
  return d;
};

const Tile = ({ item }: { item: Item }) => (
  <Link
    to={item.path}
    className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card/60 p-3 text-center active:scale-95 transition-transform hover:border-primary/40"
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <item.icon className="h-5 w-5" />
    </span>
    <span className="text-[11px] font-medium leading-tight text-foreground">{item.label}</span>
  </Link>
);

const ServicesHub = () => {
  const { session, role } = useAuth();
  const [q, setQ] = useState("");
  const groups: Group[] = [
    ...(session ? [{ title: "My Dashboards", items: dashboardsFor(role) }] : []),
    ...publicGroups,
  ];
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) }))
    .filter((g) => g.items.length);

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO title="All Services — JAAGA X" description="Every JAAGA X service in one place: property, hotels, agents, finance, AI and dashboards." canonicalPath="/services" />
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">All Services</h1>
        <p className="text-sm text-muted-foreground mb-4">Everything JAAGA X offers, in one place.</p>
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" className="pl-9 h-11 rounded-xl" />
        </div>
        {filtered.map((g) => (
          <section key={g.title} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {g.items.map((i) => <Tile key={i.path + i.label} item={i} />)}
            </div>
          </section>
        ))}
        {!filtered.length && <p className="text-center text-muted-foreground py-10">No service found.</p>}
      </main>
    </div>
  );
};

export default ServicesHub;
