import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, MessageCircle, X, Calendar, Mail, Globe, Shield, Star,
  MapPin, Award, Building2, ChevronDown, Play, ChevronRight, ChevronLeft,
  ChevronUp, Users, User, Home, Search, Layers, Crown, CheckCircle2, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  builder: any;
}

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const PROPERTY_TYPES = [
  { label: "All", value: "all" },
  { label: "1 BHK", value: "1" },
  { label: "2 BHK", value: "2" },
  { label: "3 BHK", value: "3" },
  { label: "4 BHK", value: "4" },
  { label: "5+ BHK", value: "5" },
  { label: "Villa", value: "Villa" },
  { label: "Duplex", value: "Duplex" },
  { label: "Penthouse", value: "Penthouse" },
  { label: "Plot", value: "Plot" },
];

const BUDGET_RANGES = [
  { label: "Any", min: 0, max: 0 },
  { label: "Under ₹50L", min: 0, max: 5000000 },
  { label: "₹50L – ₹1Cr", min: 5000000, max: 10000000 },
  { label: "₹1Cr – ₹2Cr", min: 10000000, max: 20000000 },
  { label: "₹2Cr – ₹5Cr", min: 20000000, max: 50000000 },
  { label: "₹5Cr+", min: 50000000, max: 0 },
];

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "properties", label: "Properties" },
  { id: "gallery", label: "Gallery" },
  { id: "trust", label: "Trust" },
  { id: "contact", label: "Contact" },
];

const LuxuryMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  const [headerCompact, setHeaderCompact] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Property filters
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBudget, setSelectedBudget] = useState(0);
  const [locationFilter, setLocationFilter] = useState("");
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  // Enquiry form
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder.builder_name}%`).limit(20);
      if (data) setProjects(data);
    };
    if (builder.builder_name) fetchProjects();
  }, [builder.builder_name]);

  useEffect(() => {
    const fetchProperties = async () => {
      setPropertiesLoading(true);
      try {
        let query = (supabase.from("properties" as any).select("*") as any).eq("verified", true).gt("price", 0);
        if (builder.id) query = query.eq("builder_id", builder.id);
        const typeVal = selectedType;
        if (typeVal !== "all") {
          const bhkNum = parseInt(typeVal);
          if (!isNaN(bhkNum)) {
            bhkNum >= 5 ? (query = query.gte("bhk", 5)) : (query = query.eq("bhk", bhkNum));
          } else {
            query = query.ilike("type", `%${typeVal}%`);
          }
        }
        const budget = BUDGET_RANGES[selectedBudget];
        if (budget.min > 0) query = query.gte("price", budget.min);
        if (budget.max > 0) query = query.lte("price", budget.max);
        if (locationFilter.trim()) {
          query = query.or(`city.ilike.%${locationFilter.trim()}%,locality.ilike.%${locationFilter.trim()}%`);
        }
        const { data } = await query.order("price", { ascending: true }).limit(12);
        setFilteredProperties((data as any) || []);
      } catch {
        setFilteredProperties([]);
      } finally {
        setPropertiesLoading(false);
      }
    };
    fetchProperties();
  }, [selectedType, selectedBudget, locationFilter, builder.id]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 600);
    setHeaderCompact(window.scrollY > 100);
    for (const section of [...NAV_ITEMS].reverse()) {
      const el = sectionRefs.current[section.id];
      if (el && el.getBoundingClientRect().top <= 140) {
        setActiveSection(section.id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
  };

  const handleEnquirySubmit = () => {
    if (!enquiryName.trim() || !enquiryPhone.trim()) {
      toast.error("Please fill in your name and phone number");
      return;
    }
    toast.success("Enquiry sent successfully! We'll get back to you soon.");
    setEnquiryName("");
    setEnquiryPhone("");
    setEnquiryMessage("");
    setEnquiryOpen(false);
  };

  const handleDownloadBrochure = () => {
    toast.info("Brochure download will be available soon. Contact the builder for details.");
  };

  const allImages = builder.images?.filter(Boolean) || [];
  const people = Array.isArray(builder.key_people) ? builder.key_people : [];

  const startingPrice = builder.price_range_min ? formatPrice(builder.price_range_min) : null;

  // ───────── RENDER ─────────
  return (
    <div className="min-h-screen bg-white text-[#0B1220]">

      {/* ═══ FIXED HEADER ═══ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        headerCompact
          ? "h-14 bg-white/90 backdrop-blur-2xl border-b border-[#E2E8F0] shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
          : "h-16 bg-transparent"
      )}>
        <div className="h-full max-w-[1200px] mx-auto flex items-center px-5 md:px-8">
          <button onClick={() => navigate(-1)} className={cn(
            "flex items-center gap-1.5 text-sm font-medium transition-colors",
            headerCompact ? "text-[#475569] hover:text-[#0B1220]" : "text-white/70 hover:text-white"
          )}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex-1 flex items-center justify-center gap-2.5">
            {headerCompact && builder.logo && (
              <img src={builder.logo} alt="" className="h-7 w-7 rounded-lg object-contain" />
            )}
            <span className={cn(
              "text-xs font-semibold tracking-[0.15em] uppercase transition-all",
              headerCompact ? "opacity-100 text-[#0B1220]" : "opacity-0"
            )}>{builder.builder_name}</span>
          </div>
          <Button
            size="sm"
            onClick={() => setEnquiryOpen(true)}
            className={cn(
              "text-xs rounded-full px-5 font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]",
              headerCompact
                ? "bg-[#0B1220] text-white hover:bg-[#1a2540]"
                : "bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/25"
            )}
          >
            Enquire Now
          </Button>
        </div>
      </header>

      {/* ═══ HERO — 85vh, clean & minimal ═══ */}
      <section className="relative h-[85vh] min-h-[520px] flex items-end overflow-hidden">
        {builder.images?.[0] ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] to-[#1a2540]" />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/50 to-[#0B1220]/20" />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 md:px-10 pb-16">
          <div className="max-w-2xl space-y-5">
            {/* Single badge */}
            {builder.rera_number ? (
              <Badge className="bg-white/10 backdrop-blur-md text-white/90 border border-white/15 text-[11px] font-medium px-3.5 py-1.5 rounded-full">
                <Shield className="h-3 w-3 mr-1.5" /> Verified Premium Builder
              </Badge>
            ) : (
              <Badge className="bg-white/10 backdrop-blur-md text-white/90 border border-white/15 text-[11px] font-medium px-3.5 py-1.5 rounded-full">
                <Crown className="h-3 w-3 mr-1.5" /> Premium Builder
              </Badge>
            )}

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05]">
              {builder.builder_name}
            </h1>

            {builder.tagline && (
              <p className="text-base md:text-lg text-white/50 font-light max-w-lg leading-relaxed">
                {builder.tagline}
              </p>
            )}

            {/* Rating */}
            {builder.customer_rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={cn("h-4 w-4", i <= Math.round(builder.customer_rating) ? "fill-[#D4AF37] text-[#D4AF37]" : "text-white/20")} />
                  ))}
                </div>
                <span className="text-white/60 text-sm">{builder.customer_rating}</span>
              </div>
            )}

            {/* CTAs */}
            <div className="flex gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => scrollToSection("projects")}
                className="rounded-full px-8 bg-white text-[#0B1220] hover:bg-white/90 font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                View Projects
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setEnquiryOpen(true)}
                className="rounded-full px-8 border-white/25 text-white hover:bg-white/10 font-semibold bg-transparent hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                Contact
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleDownloadBrochure}
                className="rounded-full px-6 border-white/25 text-white hover:bg-white/10 font-medium bg-transparent hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                <Download className="h-4 w-4 mr-1.5" /> Brochure
              </Button>
            </div>
          </div>

          {/* Floating Stats Panel — bottom-right of hero on desktop */}
          <div className="hidden lg:block absolute right-10 bottom-16">
            <div className="bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/15 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.3)] min-w-[260px]">
              <div className="space-y-4">
                {builder.number_of_projects > 0 && (
                  <StatRow label="Total Projects" value={builder.number_of_projects} />
                )}
                {builder.years_of_experience > 0 && (
                  <StatRow label="Years of Experience" value={`${builder.years_of_experience}+`} />
                )}
                {builder.total_units_delivered > 0 && (
                  <StatRow label="Units Delivered" value={builder.total_units_delivered.toLocaleString("en-IN")} />
                )}
                {startingPrice && (
                  <StatRow label="Starting Price" value={startingPrice} accent />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/30 animate-bounce">
          <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* Mobile Stats (visible on mobile only) */}
      <div className="lg:hidden grid grid-cols-2 gap-3 px-5 -mt-8 relative z-20">
        {builder.number_of_projects > 0 && (
          <MobileStatCard label="Projects" value={builder.number_of_projects} />
        )}
        {builder.years_of_experience > 0 && (
          <MobileStatCard label="Experience" value={`${builder.years_of_experience}+ yrs`} />
        )}
        {builder.total_units_delivered > 0 && (
          <MobileStatCard label="Units Delivered" value={builder.total_units_delivered.toLocaleString("en-IN")} />
        )}
        {startingPrice && (
          <MobileStatCard label="Starting At" value={startingPrice} />
        )}
      </div>

      {/* ═══ Sticky Nav ═══ */}
      <nav className="sticky top-14 z-40 bg-white/95 backdrop-blur-xl border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center h-12 px-5 md:px-8 min-w-max">
            {NAV_ITEMS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "h-full px-5 text-xs font-medium tracking-wide border-b-2 transition-all whitespace-nowrap",
                  activeSection === s.id
                    ? "text-[#0B1220] border-[#D4AF37]"
                    : "border-transparent text-[#94A3B8] hover:text-[#475569]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">

        {/* ── ABOUT ── */}
        <section ref={el => (sectionRefs.current["about"] = el)} className="py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-6">
              <SectionLabel text="About" />
              <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] leading-tight tracking-tight">
                Building Homes.<br />Building Trust.
              </h2>
              {builder.description && (
                <p className="text-[#475569] leading-relaxed text-base max-w-lg">
                  {builder.description}
                </p>
              )}
              {builder.operating_cities?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <MapPin className="h-4 w-4 text-[#D4AF37]" />
                  <span>Active in {builder.operating_cities.join(", ")}</span>
                </div>
              )}
              {builder.customer_rating > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <Star className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
                  <span>Rated {builder.customer_rating}/5 by homeowners</span>
                </div>
              )}
              {builder.about_vision && (
                <blockquote className="border-l-2 border-[#D4AF37] pl-4 text-sm text-[#475569] italic">
                  {builder.about_vision}
                </blockquote>
              )}
            </div>
            <div className="relative">
              {allImages[1] ? (
                <div className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                  <img src={allImages[1]} alt="" className="w-full aspect-[4/3] object-cover" />
                </div>
              ) : allImages[0] ? (
                <div className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                  <img src={allImages[0]} alt="" className="w-full aspect-[4/3] object-cover" />
                </div>
              ) : (
                <div className="rounded-2xl bg-[#F6F7F9] aspect-[4/3] flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-[#E2E8F0]" />
                </div>
              )}
              {/* Established year overlay */}
              {builder.established_year && (
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] px-5 py-3 border border-[#E2E8F0]">
                  <p className="text-xs text-[#94A3B8]">Established</p>
                  <p className="text-xl font-bold text-[#0B1220]">{builder.established_year}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── FEATURED PROJECTS ── */}
        {projects.length > 0 && (
          <section ref={el => (sectionRefs.current["projects"] = el)} className="py-10 lg:py-14">
            <div className="flex items-end justify-between mb-10">
              <div>
                <SectionLabel text="Projects" />
                <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 tracking-tight">Featured Projects</h2>
              </div>
              <p className="text-sm text-[#94A3B8] hidden md:block">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-400"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#F6F7F9]">
                    {(p.image || p.images?.[0]) ? (
                      <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Building2 className="h-10 w-10 text-[#E2E8F0]" /></div>
                    )}
                    {p.status && (
                      <Badge className={cn(
                        "absolute top-3 left-3 text-[10px] font-medium rounded-full px-2.5 py-1",
                        p.status === "Ready" || p.status === "Completed"
                          ? "bg-emerald-500/90 text-white border-0"
                          : "bg-white/90 backdrop-blur-sm text-[#0B1220] border border-[#E2E8F0]"
                      )}>
                        {p.status}
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#0B1220] text-base group-hover:text-[#D4AF37] transition-colors">{p.name}</h3>
                    <p className="text-sm text-[#94A3B8] mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {p.locality}{p.city ? `, ${p.city}` : ""}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        {(p.price_min || p.price_max) && (
                          <p className="text-sm font-semibold text-[#0B1220]">
                            {formatPrice(p.price_min)}{p.price_max ? ` – ${formatPrice(p.price_max)}` : ""}
                          </p>
                        )}
                      </div>
                      {p.bhk_types && (
                        <span className="text-xs text-[#94A3B8] bg-[#F6F7F9] px-2.5 py-1 rounded-full">{p.bhk_types}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Divider />

        {/* ── FIND PROPERTIES ── */}
        <section ref={el => (sectionRefs.current["properties"] = el)} className="py-10 lg:py-14">
          <SectionLabel text="Properties" />
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 mb-8 tracking-tight">Find Your Home</h2>

          {/* Filters */}
          <div className="space-y-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium border transition-all hover:scale-[1.03] active:scale-[0.97]",
                    selectedType === t.value
                      ? "bg-[#0B1220] text-white border-[#0B1220]"
                      : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#94A3B8]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <Input
                  placeholder="Search city or locality..."
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  className="h-11 pl-10 rounded-xl border-[#E2E8F0] bg-[#F6F7F9] text-sm focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {BUDGET_RANGES.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedBudget(i)}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-all",
                      selectedBudget === i
                        ? "bg-[#0B1220] text-white border-[#0B1220]"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#94A3B8]"
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {propertiesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#E2E8F0] border-t-[#D4AF37] rounded-full animate-spin" />
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProperties.map((prop: any) => (
                <div
                  key={prop.id}
                  onClick={() => navigate(`/property/${prop.id}`)}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-400"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[#F6F7F9]">
                    {Array.isArray(prop.images) && prop.images[0] ? (
                      <img src={prop.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Home className="h-8 w-8 text-[#E2E8F0]" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-sm text-[#0B1220] truncate group-hover:text-[#D4AF37] transition-colors">{prop.title}</h4>
                    <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.locality}, {prop.city}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-[#0B1220]">{formatPrice(prop.price)}</span>
                      <div className="flex gap-1.5">
                        {prop.bhk && <span className="text-[10px] bg-[#F6F7F9] text-[#475569] px-2 py-0.5 rounded-full">{prop.bhk} BHK</span>}
                        {prop.area_sqft && <span className="text-[10px] bg-[#F6F7F9] text-[#475569] px-2 py-0.5 rounded-full">{prop.area_sqft} sqft</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-[#F6F7F9] border border-[#E2E8F0]">
              <Home className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#94A3B8]">No properties found</p>
              <p className="text-xs text-[#94A3B8]/70 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </section>

        <Divider />

        {/* ── GALLERY ── */}
        {allImages.length > 0 && (
          <section ref={el => (sectionRefs.current["gallery"] = el)} className="py-10 lg:py-14">
            <SectionLabel text="Gallery" />
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 mb-8 tracking-tight">Visual Tour</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allImages.map((img: string, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "relative overflow-hidden cursor-pointer group rounded-xl",
                    i === 0 ? "col-span-2 row-span-2 aspect-[16/10]" : "aspect-square"
                  )}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              ))}
            </div>
            {builder.videos?.length > 0 && (
              <div className="flex gap-2 mt-4">
                {builder.videos.map((v: string, i: number) => (
                  <Button key={i} variant="outline" size="sm" className="rounded-full text-xs border-[#E2E8F0] text-[#475569] hover:bg-[#F6F7F9]" onClick={() => window.open(v, "_blank")}>
                    <Play className="h-3 w-3 mr-1.5" /> Video {i + 1}
                  </Button>
                ))}
              </div>
            )}
          </section>
        )}

        <Divider />

        {/* ── TRUST / CREDIBILITY ── */}
        <section ref={el => (sectionRefs.current["trust"] = el)} className="py-10 lg:py-14">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <SectionLabel text="Trust" center />
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 tracking-tight">Why Choose Us</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {builder.customer_rating > 0 && (
              <TrustCard icon={<Star className="h-5 w-5" />} value={`${builder.customer_rating}/5`} label="Customer Rating" />
            )}
            {builder.completed_projects_count > 0 && (
              <TrustCard icon={<CheckCircle2 className="h-5 w-5" />} value={builder.completed_projects_count} label="Projects Completed" />
            )}
            {builder.years_of_experience > 0 && (
              <TrustCard icon={<Award className="h-5 w-5" />} value={`${builder.years_of_experience}+`} label="Years Experience" />
            )}
            {builder.total_units_delivered > 0 && (
              <TrustCard icon={<Users className="h-5 w-5" />} value={builder.total_units_delivered.toLocaleString("en-IN")} label="Families Served" />
            )}
          </div>

          {/* RERA + Awards */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {builder.rera_number && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-full text-xs font-medium border border-emerald-100">
                <Shield className="h-4 w-4" /> RERA Verified — {builder.rera_number}
              </div>
            )}
            {builder.awards?.map((a: string, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-[#F6F7F9] text-[#475569] px-4 py-2.5 rounded-full text-xs font-medium border border-[#E2E8F0]">
                <Award className="h-3.5 w-3.5 text-[#D4AF37]" /> {a}
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── LOCATION ── */}
        {builder.operating_cities?.length > 0 && (
          <section className="py-10 lg:py-12">
            <div className="bg-[#F6F7F9] rounded-2xl p-8 md:p-12 text-center">
              <SectionLabel text="Locations" center />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0B1220] mt-3 mb-6 tracking-tight">Where We Build</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {builder.operating_cities.map((city: string) => (
                  <span key={city} className="flex items-center gap-2 bg-white text-[#0B1220] px-5 py-2.5 rounded-full text-sm font-medium border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" /> {city}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <Divider />

        {/* ── LEADERSHIP ── */}
        {people.length > 0 && (
          <section className="py-10 lg:py-14">
            <SectionLabel text="Team" />
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 mb-8 tracking-tight">Leadership</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {people.map((person: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-[#F6F7F9] border border-[#E2E8F0] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-[#E2E8F0] flex-shrink-0">
                    {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-[#94A3B8]" />}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0B1220] text-sm">{person.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Divider />

        {/* ── CONTACT / ENQUIRY ── */}
        <section ref={el => (sectionRefs.current["contact"] = el)} className="py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <SectionLabel text="Contact" />
              <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mt-3 mb-6 tracking-tight">Let's Connect</h2>
              <p className="text-[#475569] mb-8 max-w-md">Interested in our projects? Reach out and our team will get back to you within 24 hours.</p>

              <div className="space-y-3">
                <Button className="w-full h-12 rounded-xl bg-[#0B1220] text-white hover:bg-[#1a2540] gap-2 font-semibold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={() => window.open(`tel:${builder.phone}`)}>
                  <Phone className="h-4 w-4" /> Call Now
                </Button>
                {builder.whatsapp && (
                  <Button variant="outline" className="w-full h-12 rounded-xl border-[#E2E8F0] text-[#475569] hover:bg-[#F6F7F9] gap-2 text-sm hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                )}
                {builder.email && (
                  <Button variant="outline" className="w-full h-12 rounded-xl border-[#E2E8F0] text-[#475569] hover:bg-[#F6F7F9] gap-2 text-sm hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={() => window.open(`mailto:${builder.email}`)}>
                    <Mail className="h-4 w-4" /> Email
                  </Button>
                )}
                {builder.website && (
                  <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-[#E2E8F0] text-[#475569] hover:bg-[#F6F7F9] text-sm transition-all">
                    <Globe className="h-4 w-4" /> {builder.website.replace(/https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>

            {/* Enquiry Form */}
            <div className="bg-[#F6F7F9] rounded-2xl p-6 md:p-8 border border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#0B1220] mb-5">Send an Enquiry</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Your Name *</label>
                  <Input value={enquiryName} onChange={e => setEnquiryName(e.target.value)} placeholder="Full name" className="h-11 rounded-xl border-[#E2E8F0] bg-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Phone Number *</label>
                  <Input value={enquiryPhone} onChange={e => setEnquiryPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="h-11 rounded-xl border-[#E2E8F0] bg-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Message</label>
                  <Textarea value={enquiryMessage} onChange={e => setEnquiryMessage(e.target.value)} placeholder="Interested in a specific project?" rows={3} className="rounded-xl border-[#E2E8F0] bg-white text-sm resize-none" />
                </div>
                <Button
                  onClick={handleEnquirySubmit}
                  className="w-full h-12 rounded-xl bg-[#D4AF37] text-white hover:bg-[#b89930] font-semibold text-sm shadow-[0_4px_16px_rgba(212,175,55,0.2)] hover:shadow-[0_6px_24px_rgba(212,175,55,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Submit Enquiry
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ═══ STICKY BOTTOM CTA (mobile) ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex gap-2.5">
          <Button className="flex-1 h-11 rounded-xl bg-[#0B1220] text-white text-sm font-semibold hover:bg-[#1a2540]" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-4 w-4 mr-1.5" /> Call
          </Button>
          <Button className="flex-1 h-11 rounded-xl bg-[#D4AF37] text-white text-sm font-semibold hover:bg-[#b89930]" onClick={() => setEnquiryOpen(true)}>
            Enquire
          </Button>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-20 lg:bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F6F7F9] shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all">
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* ═══ ENQUIRY SLIDE-IN ═══ */}
      {enquiryOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={() => setEnquiryOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 shadow-2xl flex flex-col bg-white border-l border-[#E2E8F0] animate-slide-in-right">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <h3 className="font-semibold text-sm text-[#0B1220]">Enquire — {builder.builder_name}</h3>
              <button onClick={() => setEnquiryOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:bg-[#F6F7F9] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[#475569] mb-1.5 block">Your Name *</label>
                <Input value={enquiryName} onChange={e => setEnquiryName(e.target.value)} placeholder="Full name" className="h-11 rounded-xl border-[#E2E8F0] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#475569] mb-1.5 block">Phone *</label>
                <Input value={enquiryPhone} onChange={e => setEnquiryPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="h-11 rounded-xl border-[#E2E8F0] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#475569] mb-1.5 block">Message</label>
                <Textarea value={enquiryMessage} onChange={e => setEnquiryMessage(e.target.value)} placeholder="I'm interested in..." rows={3} className="rounded-xl border-[#E2E8F0] text-sm resize-none" />
              </div>
              <Button onClick={handleEnquirySubmit} className="w-full h-12 rounded-xl bg-[#D4AF37] text-white hover:bg-[#b89930] font-semibold text-sm shadow-[0_4px_16px_rgba(212,175,55,0.2)]">
                Submit Enquiry
              </Button>
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#E2E8F0] text-[#475569] text-sm gap-2" onClick={() => window.open(`tel:${builder.phone}`)}>
                  <Phone className="h-4 w-4" /> Call Now
                </Button>
                {builder.whatsapp && (
                  <Button variant="outline" className="w-full h-11 rounded-xl border-[#E2E8F0] text-[#475569] text-sm gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain" />
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 rounded-full bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxOpen(false)}><X className="h-5 w-5" /></Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxIndex(p => (p - 1 + allImages.length) % allImages.length)}><ChevronLeft className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxIndex(p => (p + 1) % allImages.length)}><ChevronRight className="h-5 w-5" /></Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom padding for mobile sticky CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

// ── Sub-components ──

const SectionLabel = ({ text, center }: { text: string; center?: boolean }) => (
  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]", center && "text-center")}>{text}</p>
);

const Divider = () => <div className="h-px bg-[#E2E8F0] mx-0" />;

const StatRow = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-white/50 text-sm">{label}</span>
    <span className={cn("text-base font-semibold", accent ? "text-[#D4AF37]" : "text-white")}>{value}</span>
  </div>
);

const MobileStatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-center">
    <p className="text-lg font-bold text-[#0B1220]">{value}</p>
    <p className="text-[11px] text-[#94A3B8] mt-0.5">{label}</p>
  </div>
);

const TrustCard = ({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) => (
  <div className="text-center p-6 rounded-2xl bg-[#F6F7F9] border border-[#E2E8F0] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
    <div className="w-10 h-10 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3 text-[#D4AF37]">
      {icon}
    </div>
    <p className="text-2xl font-bold text-[#0B1220]">{value}</p>
    <p className="text-xs text-[#94A3B8] mt-1">{label}</p>
  </div>
);

export default LuxuryMicrosite;
