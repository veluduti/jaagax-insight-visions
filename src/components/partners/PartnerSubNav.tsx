import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BedDouble, CalendarRange, Users, BarChart3, Wallet, MessageSquare, Star, LifeBuoy, Settings,
  TrendingUp, Sparkles, UserCog, Globe, MoreHorizontal, Tag, PartyPopper, Building2, CalendarDays, Target, Briefcase, ChevronDown, Check, ClipboardList, PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePartnerBusinessTypes } from "@/hooks/usePartnerBusinessTypes";
import { CATEGORY_BY_KEY, normalizeCategory } from "@/config/hospitalityCategories";
import { supabase } from "@/integrations/supabase/client";
import { listProperties, type PartnerProperty } from "@/services/hospitality/partnerService";

const PROP_KEY = "partner_active_property";

const more = [
  { to: "/partners/payouts", label: "Payments", icon: Wallet },
  { to: "/partners/inbox", label: "Reviews", icon: Star },
  { to: "/partners/inbox#messages", label: "Messages", icon: MessageSquare },
  { to: "/partners/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/partners/hotel-profile", label: "Settings", icon: Settings },
  { to: "mailto:support@jaagax.com", label: "Support", icon: LifeBuoy },
  { sep: true },
  { to: "/partners/portfolio", label: "Account & Businesses", icon: Briefcase },
  { to: "/partners/growth", label: "Grow Bookings", icon: TrendingUp },
  { to: "/partners/demo", label: "Demo Property", icon: PlayCircle },
  { to: "/partners/long-stays", label: "Long Stays & Waitlist", icon: CalendarRange },
  { to: "/partners/staff", label: "Staff", icon: UserCog },
  { to: "/partners/demand", label: "Demand & Matches", icon: Target },
  { to: "/partners/rate-plans", label: "Rate Plans", icon: Tag },
  { to: "/partners/extra-services", label: "Extra Services", icon: PartyPopper },
  { to: "/partners/addons", label: "Add-ons", icon: Sparkles },
  { to: "/partners/booking-engine", label: "Booking Engine", icon: Globe },
] as const;

export default function PartnerSubNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { modules, types, activeType, setActiveType, hotelId } = usePartnerBusinessTypes();
  const [props, setProps] = useState<PartnerProperty[]>([]);
  const [activeProp, setActiveProp] = useState<string | null>(() => localStorage.getItem(PROP_KEY));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) listProperties(user.id).then(setProps).catch(() => setProps([]));
    });
  }, []);

  const typesOf = (p: PartnerProperty) => {
    const t = (p.business_types ?? []).map(normalizeCategory);
    return t.length ? Array.from(new Set(t)) : p.id === hotelId && types.length ? types : ["hotel"];
  };
  const current = props.find((p) => p.id === activeProp) ?? props.find((p) => p.id === hotelId) ?? props[0];
  const currentType = activeType !== "all" ? activeType : current ? typesOf(current)[0] : types[0];

  // Menu changes with the selected property's type — no inventory jargon.
  const sharedLiving = modules.has("beds") && modules.has("longstay");
  const contextual = sharedLiving
    ? [
        { to: "/partners/rooms", label: "Rooms & Beds", icon: BedDouble },
        { to: "/partners/guests", label: "Residents", icon: Users },
        { to: "/partners/pricing", label: "Monthly Pricing", icon: TrendingUp },
      ]
    : modules.has("units") && !modules.has("rooms")
      ? [
          { to: "/partners/rooms", label: "Units", icon: BedDouble },
          { to: "/partners/pricing", label: modules.has("longstay") ? "Daily / Monthly Pricing" : "Pricing", icon: TrendingUp },
        ]
      : [
          { to: "/partners/rooms", label: modules.has("beds") ? "Rooms & Beds" : "Rooms", icon: BedDouble },
          { to: "/partners/pricing", label: "Pricing", icon: TrendingUp },
          { to: "/partners/guests", label: "Guests", icon: Users },
        ];

  const primary = [
    { to: "/partners/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/partners/properties", label: "Properties", icon: Building2 },
    { to: "/partners/operations", label: "Today", icon: ClipboardList },
    { to: "/partners/reservations", label: "Bookings", icon: CalendarRange },
    { to: "/partners/inventory", label: "Calendar", icon: CalendarDays },
    ...contextual,
  ];
  const moreItems = more.filter((m) =>
    "sep" in m || m.to !== "/partners/extra-services" || modules.has("meals") || modules.has("experiences") || modules.has("rooms"),
  );
  const moreActive = moreItems.some((m) => !("sep" in m) && pathname === m.to);

  const pickProperty = (p: PartnerProperty, t?: string) => {
    localStorage.setItem(PROP_KEY, p.id);
    setActiveProp(p.id);
    setActiveType(t ?? typesOf(p)[0]);
    nav(`/partners/properties/${p.id}`);
  };

  const linkCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition outline-none",
      active ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    );

  return (
    <div className="border-b border-border/60 bg-background/70 backdrop-blur">
      {typeof window !== "undefined" && localStorage.getItem("partner_demo_hotel") && (
        <div className="bg-primary/15 px-4 py-1.5 text-center text-xs font-medium text-primary">
          You are in a demo property (sample data, hidden from customers). <NavLink to="/partners/demo" className="underline">Exit or delete demo</NavLink>
        </div>
      )}
      <div className="container mx-auto max-w-7xl px-4">
        {/* Property switcher */}
        {current && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-semibold outline-none hover:bg-muted/40">
                <span>{CATEGORY_BY_KEY[currentType]?.emoji ?? "🏨"}</span>
                <span className="max-w-[180px] truncate">{current.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Your properties</DropdownMenuLabel>
                {props.flatMap((p) =>
                  typesOf(p).map((t) => {
                    const sel = current.id === p.id && currentType === t;
                    return (
                      <DropdownMenuItem key={p.id + t} onSelect={() => pickProperty(p, t)} className="flex items-start gap-2">
                        <span className="text-lg leading-none">{CATEGORY_BY_KEY[t]?.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{CATEGORY_BY_KEY[t]?.label ?? t}</p>
                        </div>
                        {sel && <Check className="h-4 w-4 text-emerald-400" />}
                      </DropdownMenuItem>
                    );
                  }),
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => nav("/partners/portfolio")}>+ Add or manage properties</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">{CATEGORY_BY_KEY[currentType]?.label} workspace</span>
          </div>
        )}

        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {primary.map(({ to, label, icon: Icon }) => (
            <NavLink key={to + label} to={to} end={to !== "/partners/properties"} className={({ isActive }) => linkCls(isActive)}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger className={linkCls(moreActive)}>
              <MoreHorizontal className="h-4 w-4" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {moreItems.map((m, i) =>
                "sep" in m ? (
                  <DropdownMenuSeparator key={`sep${i}`} />
                ) : (
                  <DropdownMenuItem
                    key={m.label}
                    onSelect={() => (m.to.startsWith("mailto:") ? (window.location.href = m.to) : nav(m.to))}
                    className="gap-2"
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
}
