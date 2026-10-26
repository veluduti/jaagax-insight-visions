import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BedDouble,
  Home,
  Plane,
  Users,
  Plus,
  Leaf,
  MapPin,
  CalendarDays,
  UsersRound,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { POPULAR_AREAS } from "@/config/popularAreas";
import { cn } from "@/lib/utils";

const INTENTS = [
  { color: "", key: "stay", label: "Find a Stay", icon: BedDouble, path: "/hotels" },
  { color: "text-destructive", key: "invest", label: "Buy / Rent / Invest", icon: Home, path: "/search" },
  { color: "text-foreground", key: "travel", label: "Smart Travel", icon: Plane, path: "/smart-stays" },
  { color: "text-primary", key: "agent", label: "Find an Agent", icon: Users, path: "/agents" },
  { color: "text-primary", key: "list", label: "List a Property", icon: Plus, path: "/sell-property" },
  { color: "text-primary", key: "experiences", label: "Explore Experiences", icon: Leaf, path: "/communities" },
];

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

const HeroSearchPanel = () => {
  const navigate = useNavigate();
  const [intent, setIntent] = useState("stay");
  const [destination, setDestination] = useState("");
  const [guests, setGuests] = useState("2");

  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(toInputDate(today));
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toInputDate(d);
  });

  const popularCities = useMemo(() => Object.keys(POPULAR_AREAS).slice(0, 8), []);

  const handleIntent = (key: string, path: string) => {
    setIntent(key);
    if (key !== "stay") navigate(path);
  };

  const search = (city?: string) => {
    const dest = (city ?? destination).trim();
    const params = new URLSearchParams();
    if (dest) params.set("city", dest);
    if (checkIn) params.set("checkin", checkIn);
    if (checkOut) params.set("checkout", checkOut);
    if (guests) params.set("guests", guests);
    navigate(`/hotels${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-none bg-card shadow-xl border border-border/60 p-3 sm:p-4 text-left">
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
            <button
              key={it.key}
              onClick={() => handleIntent(it.key, it.path)}
              className={cn(
                "flex shrink-0 items-center justify-center gap-2 rounded-none border px-3 py-2 text-xs sm:text-[13px] font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary",
              )}
            >
              <Icon className={cn("h-4 w-4", !active && it.color)} />
              {it.label}
            </button>
          );
        })}
      </div>

      {/* Search row */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-2.5">
        <label className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
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

        <label className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
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

        <label className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
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

        <label className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
          <UsersRound className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Guests</span>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} Guest{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </span>
        </label>

        <Button
          onClick={() => search()}
          className="h-auto rounded-none px-6 py-3 text-sm font-bold sm:col-span-2 lg:col-span-1"
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
            className="rounded-none border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => navigate("/ai-advisor")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-none border border-primary/30 bg-accent px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Try AI Advisor
        </button>
      </div>
    </div>
  );
};

export default HeroSearchPanel;
