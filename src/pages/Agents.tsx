import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  BedDouble,
  Home,
  Plane,
  Users,
  Plus,
  Leaf,
  BadgeCheck,
  UserCheck,
  Globe2,
  IndianRupee,
  HeartHandshake,
  ArrowRight,
  LayoutGrid,
  Map as MapIcon,
  Loader2,
  Phone,
  Mail,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import AgentDiscoveryCard from "@/components/agents/AgentDiscoveryCard";
import AgentDiscoveryMap from "@/components/agents/AgentDiscoveryMap";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AGENT_CONTACT_VISIBLE_STATUSES,
  agentPublicLabel,
} from "@/lib/agentPrivacy";
import {
  EMPTY_FILTERS,
  SERVICE_TYPES,
  PROPERTY_TYPES,
  agentCities,
  agentLocalities,
  agentLanguagesList,
  filterAgents,
  sortAgents,
  matchesService,
  matchesPropertyType,
  type AgentFilters,
  type DiscoveryAgent,
  type SortKey,
} from "@/lib/agentDiscovery";
import heroImage from "@/assets/agents-hero.jpg";

const TABS = [
  { key: "stay", label: "Find a Stay", icon: BedDouble, path: "/hotels" },
  { key: "properties", label: "Properties", icon: Home, path: "/search" },
  { key: "travel", label: "Smart Travel", icon: Plane, path: "/smart-stays" },
  { key: "agent", label: "Find an Agent", icon: Users, path: "/agents" },
  { key: "list", label: "List a Property", icon: Plus, path: "/sell-property" },
  { key: "experiences", label: "Explore Experiences", icon: Leaf, path: "/communities" },
];

const TRUST_POINTS = [
  { icon: BadgeCheck, label: "Verified Agents" },
  { icon: UserCheck, label: "Local Experts" },
  { icon: Globe2, label: "Wide Coverage" },
  { icon: IndianRupee, label: "No Hidden Charges" },
  { icon: HeartHandshake, label: "Personalized Support" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top Rated" },
  { value: "experience", label: "Most Experienced" },
  { value: "properties", label: "Most Properties" },
];

const AGENT_SELECT =
  "id, agent_code, agency_name, languages, languages_spoken, cities_served, localities_served, sales_count, rent_count, photo_url, trust_score, verified, avg_rating, total_ratings, experience_years, city, district, state, specializations";

interface ContactInfo {
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
}

const Agents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detectedLocation } = useLocationContext();

  const [agents, setAgents] = useState<DiscoveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AgentFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [contactAgent, setContactAgent] = useState<DiscoveryAgent | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactAllowed, setContactAllowed] = useState(false);

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city) {
      setFilters((f) => (f.city === "all" ? { ...f, city: detectedLocation.city } : f));
    }
  }, [detectedLocation]);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select(AGENT_SELECT)
      .order("trust_score", { ascending: false })
      .limit(300);
    if (error) {
      toast.error("Could not load agents. Please try again.");
    } else {
      setAgents((data as DiscoveryAgent[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("agents-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fetchAgents(), 1500);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the signed-in user's saved agent favorites
  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      return;
    }
    supabase
      .from("agent_favorites")
      .select("agent_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setFavorites(new Set((data || []).map((r) => r.agent_id)));
      });
  }, [user]);

  const cities = useMemo(() => agentCities(agents), [agents]);
  const localities = useMemo(() => agentLocalities(agents), [agents]);
  const languages = useMemo(() => agentLanguagesList(agents), [agents]);

  const filtered = useMemo(
    () => sortAgents(filterAgents(agents, filters), sortBy),
    [agents, filters, sortBy],
  );

  const toggleFilter = (key: "areas" | "services" | "propertyTypes" | "languages", value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const toggleFavorite = async (agent: DiscoveryAgent) => {
    if (!user) {
      toast.info("Sign in to save favorite agents.");
      navigate("/auth");
      return;
    }
    if (favorites.has(agent.id)) {
      const { error } = await supabase
        .from("agent_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("agent_id", agent.id);
      if (error) return toast.error("Could not update favorites.");
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    } else {
      const { error } = await supabase
        .from("agent_favorites")
        .insert({ user_id: user.id, agent_id: agent.id });
      if (error) return toast.error("Could not update favorites.");
      setFavorites((prev) => new Set(prev).add(agent.id));
    }
  };

  // Contact details are private until the agent is assigned to the user's
  // property and has accepted — reveal them only when that is verified.
  const openContact = async (agent: DiscoveryAgent) => {
    setContactAgent(agent);
    setContactInfo(null);
    setContactAllowed(false);
    if (!user) return;
    setContactLoading(true);
    try {
      const { data: assigned } = await supabase
        .from("properties")
        .select("id")
        .eq("listed_by", user.id)
        .eq("assigned_agent_id", agent.id)
        .in("lifecycle_status", AGENT_CONTACT_VISIBLE_STATUSES)
        .limit(1);
      if (assigned && assigned.length > 0) {
        const { data: full } = await supabase
          .from("agents")
          .select("phone, email, whatsapp_number")
          .eq("id", agent.id)
          .maybeSingle();
        setContactInfo(full as ContactInfo | null);
        setContactAllowed(true);
      }
    } finally {
      setContactLoading(false);
    }
  };

  const localityEntries = Array.from(localities.entries()).sort((a, b) => b[1] - a[1]);
  const visibleLocalities = showAllAreas ? localityEntries : localityEntries.slice(0, 5);

  const filterRow = (
    key: "areas" | "services" | "propertyTypes" | "languages",
    value: string,
    label: string,
    count?: number,
  ) => (
    <label
      key={value}
      className="flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground"
    >
      <Checkbox
        checked={filters[key].includes(value)}
        onCheckedChange={() => toggleFilter(key, value)}
        className="rounded-[4px]"
      />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
    </label>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find a Trusted Agent | JaagaX"
        description="Connect with verified real estate professionals for buying, selling, renting, investment and property management."
      />
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="JaagaX agent showing a home to a couple"
          width={1920}
          height={800}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="container relative z-10 mx-auto flex flex-col gap-8 px-4 py-14 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-sm text-white/80">
              <Link to="/" className="hover:text-white">Home</Link>
              <span>›</span>
              <span className="text-white">Find an Agent</span>
            </p>
            <h1 className="text-4xl font-bold text-white md:text-5xl">Find a Trusted Agent</h1>
            <p className="mt-4 max-w-xl text-base text-white/85 md:text-lg">
              Connect with verified real estate professionals for buying, selling, renting,
              investment and property management.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {TRUST_POINTS.map((t) => (
                <span key={t.label} className="flex items-center gap-1.5 text-sm text-white/90">
                  <t.icon className="h-4 w-4 text-primary-foreground" />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Join as an Agent */}
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h2 className="font-bold text-foreground">Want to become a Jaaga Agent?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grow your business with Jaaga. Get verified, access exclusive properties and
                  earn more.
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full gap-2" onClick={() => navigate("/agent/register")}>
              Join as an Agent <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Intent tabs */}
      <div className="container mx-auto px-4">
        <div className="-mt-7 relative z-20 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:grid-cols-3 lg:grid-cols-6">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-4 text-sm font-medium transition",
                tab.key === "agent"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Search bar */}
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_180px_1.4fr_auto]">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Select
              value={filters.city}
              onValueChange={(v) => setFilters((f) => ({ ...f, city: v }))}
            >
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select
            value={filters.services[0] || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, services: v === "all" ? [] : [v] }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {SERVICE_TYPES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.propertyTypes[0] || "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, propertyTypes: v === "all" ? [] : [v] }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by agent code or company..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <Button
            className="gap-2"
            onClick={() =>
              document.getElementById("agent-results")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Search Agents <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div id="agent-results" className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters sidebar */}
          <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">Filters</h2>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* Location */}
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Location</h3>
              {visibleLocalities.map(([label, count]) =>
                filterRow("areas", label, label, count),
              )}
              {localityEntries.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllAreas((v) => !v)}
                  className="mt-1 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {showAllAreas ? "Show less" : "Show more"}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition", showAllAreas && "rotate-180")}
                  />
                </button>
              )}
              {localityEntries.length === 0 && (
                <p className="text-xs text-muted-foreground">No areas saved yet</p>
              )}
            </div>

            {/* Service Type */}
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Service Type</h3>
              {SERVICE_TYPES.map((s) =>
                filterRow(
                  "services",
                  s.id,
                  s.label,
                  agents.filter((a) => matchesService(a, s.id)).length,
                ),
              )}
            </div>

            {/* Property Type */}
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Property Type</h3>
              {PROPERTY_TYPES.map((t) =>
                filterRow(
                  "propertyTypes",
                  t.id,
                  t.label,
                  agents.filter((a) => matchesPropertyType(a, t.id)).length,
                ),
              )}
            </div>

            {/* Languages */}
            {languages.size > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Agent Language</h3>
                {Array.from(languages.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => filterRow("languages", label, label, count))}
              </div>
            )}

            {/* Verified */}
            <div className="mt-4 border-t border-border pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={filters.verifiedOnly}
                  onCheckedChange={(v) =>
                    setFilters((f) => ({ ...f, verifiedOnly: v === true }))
                  }
                  className="rounded-[4px]"
                />
                Verified agents only
              </label>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {filtered.length} {filters.verifiedOnly ? "Verified " : ""}Agent
                  {filtered.length === 1 ? "" : "s"}
                  {filters.city !== "all" && (
                    <>
                      {" "}in <span className="text-primary">{filters.city}</span>
                    </>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Find the right agent based on your needs. Compare profiles, ratings and reviews.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon className="h-4 w-4" /> Map View
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" /> List View
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-border bg-card">
                    <div className="h-40 rounded-t-xl bg-muted" />
                    <div className="space-y-3 p-4">
                      <div className="h-4 w-2/3 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                      <div className="h-10 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-16 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">No agents found matching your criteria</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try clearing some filters or searching a different area.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear All Filters
                </Button>
              </div>
            ) : viewMode === "map" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px]">
                <div className="grid items-start grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((agent, idx) => (
                    <div
                      key={agent.id}
                      onMouseEnter={() => setMapSelectedId(agent.id)}
                      className={cn(
                        mapSelectedId === agent.id && "rounded-xl ring-2 ring-primary",
                      )}
                    >
                      <AgentDiscoveryCard
                        agent={agent}
                        index={idx}
                        isFavorite={favorites.has(agent.id)}
                        onToggleFavorite={toggleFavorite}
                        onContact={openContact}
                        compact
                      />
                    </div>
                  ))}
                </div>
                <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-[520px] overflow-hidden rounded-xl">
                  <AgentDiscoveryMap
                    agents={filtered}
                    selectedId={mapSelectedId}
                    onSelect={setMapSelectedId}
                    onProfile={(a) => navigate(`/agent/${a.id}`)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((agent, idx) => (
                  <AgentDiscoveryCard
                    key={agent.id}
                    agent={agent}
                    index={idx}
                    isFavorite={favorites.has(agent.id)}
                    onToggleFavorite={toggleFavorite}
                    onContact={openContact}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact dialog — details unlock after the agent accepts your assignment */}
      <Dialog open={!!contactAgent} onOpenChange={(open) => !open && setContactAgent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Contact {contactAgent ? agentPublicLabel(contactAgent) : "Agent"}
            </DialogTitle>
          </DialogHeader>
          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to contact agents and track your requests.
              </p>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          ) : contactLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : contactAllowed && contactInfo ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                This agent is assigned to your property — contact details are unlocked.
              </p>
              {contactInfo.whatsapp_number && (
                <Button
                  className="w-full gap-2"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${contactInfo.whatsapp_number!.replace(/[^0-9]/g, "")}`,
                      "_blank",
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp {contactInfo.whatsapp_number}
                </Button>
              )}
              {contactInfo.phone && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => (window.location.href = `tel:${contactInfo.phone}`)}
                >
                  <Phone className="h-4 w-4" /> Call {contactInfo.phone}
                </Button>
              )}
              {contactInfo.email && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => (window.location.href = `mailto:${contactInfo.email}`)}
                >
                  <Mail className="h-4 w-4" /> {contactInfo.email}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To protect our agents from spam, contact details are shared once the agent is
                assigned to your property and accepts the request. Post your property or book a
                Smart Visit to get connected with this agent.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => contactAgent && navigate(`/agent/${contactAgent.id}`)}
                >
                  View Profile
                </Button>
                <Button className="flex-1" onClick={() => navigate("/sell-property")}>
                  Post a Property
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Agents;
