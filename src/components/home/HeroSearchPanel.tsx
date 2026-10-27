import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BedDouble,
  Home,
  Plane,
  Users,
  Plus,
  Minus,
  Leaf,
  MapPin,
  CalendarDays,
  UsersRound,
  Search,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Building2,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { POPULAR_AREAS } from "@/config/popularAreas";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { buildPropertyKindGroups } from "./propertyKindOptions";
import { getPropertyFlow } from "@/config/propertyFlows";
import { PROPERTY_MAIN_TYPES } from "@/config/propertyMainTypes";

const PROPERTY_KIND_CATEGORIES = [
  { label: "🏠 Residential", id: "residential", field: "property_type" },
  { label: "🏢 Commercial", id: "commercial", field: "property_type" },
  { label: "📐 Plots / Land", id: "plots", field: "plot_type" },
  { label: "🌾 Agricultural", id: "agriculture", field: "agricultural_land_type" },
  { label: "💼 Co-working", id: "coworking", field: "shared_space_type" },
].map((c) => ({
  label: c.label,
  types: ((getPropertyFlow(c.id as any)?.fields as any)?.[c.field]?.options as string[]) || [],
}));

const INTENTS = [
  { color: "", key: "stay", label: "Find a Stay", icon: BedDouble, path: "/hotels" },
  { color: "text-destructive", key: "properties", label: "Properties", icon: Home, path: "/search" },
  { color: "text-foreground", key: "travel", label: "Smart Travel", icon: Plane, path: "/smart-stays" },
  { color: "text-primary", key: "agent", label: "Find an Agent", icon: Users, path: "/agents" },
  { color: "text-primary", key: "list", label: "List a Property", icon: Plus, path: "/sell-property" },
  { color: "text-primary", key: "experiences", label: "Explore Experiences", icon: Leaf, path: "/communities" },
];

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

interface CounterRowProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

const CounterRow = ({ label, hint, value, min, max, onChange }: CounterRowProps) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-b-0">
    <div>
      <p className="text-sm font-medium text-foreground">
        {label} <span className="text-primary font-bold ml-1">{value}</span>
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
      >
        <Minus className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="text-sm font-medium w-6 text-center">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full border border-input flex items-center justify-center hover:border-primary hover:bg-accent transition-colors"
      >
        <Plus className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  </div>
);

const HeroSearchPanel = () => {
  const navigate = useNavigate();
  const [intent, setIntent] = useState("stay");
  const [destination, setDestination] = useState("");
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [propertyPurpose, setPropertyPurpose] = useState("buy");
  const [propertyKind, setPropertyKind] = useState("any");
  const [propertyKinds, setPropertyKinds] = useState(() => buildPropertyKindGroups(PROPERTY_KIND_CATEGORIES));
  const [propertyLocation, setPropertyLocation] = useState("");
  const guestSelectorRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(toInputDate(today));
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toInputDate(d);
  });

  const popularCities = useMemo(() => Object.keys(POPULAR_AREAS).slice(0, 8), []);

  // Property type options follow the backend: the dropdown lists the types
  // that actually exist on saved property rows (falls back to the static list).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("type")
        .not("type", "is", null);
      if (cancelled || !data) return;
      setPropertyKinds(buildPropertyKindGroups(PROPERTY_KIND_CATEGORIES, (data as Array<{ type: string | null }>).map((r) => r.type || "")));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the rooms & guests popover on outside click / Escape
  useEffect(() => {
    if (!showGuestSelector) return;
    const onDown = (e: MouseEvent) => {
      if (guestSelectorRef.current && !guestSelectorRef.current.contains(e.target as Node)) {
        setShowGuestSelector(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowGuestSelector(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showGuestSelector]);

  const handleIntent = (key: string, path: string) => {
    setIntent(key);
    // "stay" and "properties" swap the card contents; the rest navigate on
    if (key !== "stay" && key !== "properties") navigate(path);
  };

  const searchProperties = (city?: string) => {
    const dest = (city ?? propertyLocation).trim();
    const params = new URLSearchParams();
    params.set("tab", "properties");
    if (dest) params.set("city", dest);
    // Buy and Invest both search sale listings; Rent filters rentals
    const listingType = propertyPurpose === "rent" ? "rent" : "buy";
    if (listingType !== "buy") params.set("type", listingType);
    if (propertyKind !== "any") params.set("propertyType", propertyKind);
    navigate(`/search?${params.toString()}`);
  };

  const guestDisplayText = () => {
    let text = `${rooms} Room${rooms > 1 ? "s" : ""}, ${adults} Adult${adults > 1 ? "s" : ""}`;
    if (children > 0) text += `, ${children} Child${children > 1 ? "ren" : ""}`;
    return text;
  };

  const search = (city?: string) => {
    const dest = (city ?? destination).trim();
    const params = new URLSearchParams();
    if (dest) params.set("city", dest);
    if (checkIn) params.set("checkin", checkIn);
    if (checkOut) params.set("checkout", checkOut);
    params.set("rooms", String(rooms));
    params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    navigate(`/hotels${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-2xl bg-card shadow-xl border border-border/60 p-3 sm:p-4 text-left">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          What brings you to Jaaga today?
        </h2>
        <button
          onClick={() => navigate("/ai-advisor")}
          className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
        >
          Let AI find the best for you
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>

      {/* Intent buttons */}
      <div className="flex lg:grid lg:grid-cols-6 gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {INTENTS.map((it) => {
          const Icon = it.icon;
          const active = intent === it.key;
          return (
            <Button
              key={it.key}
              variant="outline"
              onClick={() => handleIntent(it.key, it.path)}
              className={cn(
                "flex h-auto shrink-0 items-center justify-center gap-2 rounded-none border px-3 py-2 text-xs sm:text-[13px] font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary",
              )}
            >
              <Icon className={cn("h-4 w-4", !active && it.color)} />
              {it.label}
            </Button>
          );
        })}
      </div>

      {/* Properties card — shown when the Properties intent is active */}
      {intent === "properties" && (
        <div className="mt-1">

          {/* Buy / Rent / Invest + property type */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {[
                { v: "buy", l: "Buy" },
                { v: "rent", l: "Rent" },
                { v: "invest", l: "Invest" },
              ].map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPropertyPurpose(p.v)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors",
                    propertyPurpose === p.v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.l}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Property Type
              </span>
              <select
                value={propertyKind}
                onChange={(e) => setPropertyKind(e.target.value)}
                className="max-w-[11rem] bg-transparent text-sm font-medium text-foreground outline-none"
                aria-label="Property type"
              >
                <option value="any">All Types</option>
                {PROPERTY_MAIN_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Location + search */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 focus-within:border-primary transition-colors">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <input
                value={propertyLocation}
                onChange={(e) => setPropertyLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProperties()}
                placeholder="Enter location, city or landmark"
                list="hero-property-cities"
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
              />
              <datalist id="hero-property-cities">
                {popularCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <Button onClick={() => searchProperties()} className="rounded-xl px-6 py-3 text-sm font-bold">
              <Search className="h-4 w-4 mr-1.5" />
              Search Properties
            </Button>
          </div>

          {/* Utility row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => navigate("/search?tab=properties")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-3.5 w-3.5 text-primary" />
              </span>
              Use Current Location
            </button>
            <button
              type="button"
              onClick={() => navigate("/map")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <MapIcon className="h-3.5 w-3.5 text-primary" />
              </span>
              Search on Map
            </button>
            <button
              type="button"
              onClick={() => navigate("/ai-advisor")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Try AI Advisor
            </button>
          </div>
        </div>
      )}

      {intent !== "properties" && (<>
      {/* Search row */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr_auto] gap-2.5">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Where do you want to stay?"
              list="hero-popular-cities"
              className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
            />
            <datalist id="hero-popular-cities">
              {popularCities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </span>
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in</span>
            <input
              type="date"
              value={checkIn}
              min={toInputDate(today)}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </span>
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-out</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </span>
        </label>

        {/* Rooms & Guests — same selector as the hotels page */}
        <div ref={guestSelectorRef} className="relative">
          <button
            type="button"
            aria-label="Rooms and guests"
            aria-expanded={showGuestSelector}
            onClick={() => setShowGuestSelector((o) => !o)}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary transition-colors"
          >
            <UsersRound className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rooms & Guests</span>
              <span className="block truncate text-sm font-medium text-foreground">{guestDisplayText()}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", showGuestSelector && "rotate-180")} />
          </button>

          {showGuestSelector && (
            <div className="absolute top-full right-0 mt-2 bg-card rounded-xl shadow-2xl border border-border z-[200] p-4 w-[300px] max-w-[calc(100vw-2rem)]">
              <CounterRow label="Rooms" hint="Upto 4 rooms" value={rooms} min={1} max={4} onChange={setRooms} />
              <CounterRow label="Adults" hint="Age 18+" value={adults} min={1} max={10} onChange={setAdults} />
              <CounterRow label="Children" hint="0 - 17 Years Old" value={children} min={0} max={6} onChange={setChildren} />
              <Button size="sm" className="mt-3 w-full" onClick={() => setShowGuestSelector(false)}>
                Done
              </Button>
            </div>
          )}
        </div>

        <Button
          onClick={() => search()}
          className="h-auto rounded-xl px-6 py-3 text-sm font-bold sm:col-span-2 lg:col-span-1"
        >
          Search Stays
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      {/* Popular chips + AI advisor */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Popular:</span>
        {popularCities.map((c) => (
          <button
            key={c}
            onClick={() => search(c)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => navigate("/ai-advisor")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Try AI Advisor
        </button>
      </div>
      </>
      )}
    </div>
  );
};

export default HeroSearchPanel;
