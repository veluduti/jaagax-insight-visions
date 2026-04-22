import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { projectData, type FloorPlan } from "@/data/projectData";
import { generateBrochure } from "@/utils/generateBrochure";
import BuilderLocationMap from "./BuilderLocationMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronDown, Menu, Phone, MessageCircle, MapPin, Check, Mail, Globe,
  Shield, Star, Building2, TreePine, Baby, Car, Zap, Dumbbell, Waves,
  Gamepad2, Users, Footprints, Sparkles, Bed, Bath, Square, Compass,
  Download, ArrowRight, Eye, TrendingUp, Clock, RotateCcw, Home, Edit,
  Award, Target, ChevronUp, X, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = { Waves, Dumbbell, Building2, TreePine, Baby, Car, Shield, Zap, Gamepad2, Users, Footprints, Sparkles };
const amenityIconMap: Record<string, any> = {
  "Swimming Pool": Waves, "Gym": Dumbbell, "Parking": Car, "Garden": TreePine,
  "Security": Shield, "Wi-Fi": Zap, "Water Supply": Waves, "Power Backup": Zap,
  "Kids Play Area": Baby, "Clubhouse": Building2, "Gymnasium": Dumbbell,
  "Gardens": TreePine, "Jogging Track": Footprints, "Community Hall": Users,
  "Indoor Games": Gamepad2, "Meditation Zone": Sparkles,
};

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

function buildData(builder: any) {
  const fp = builder?.floor_plans_data || {};
  const hasFp = Object.keys(fp).length > 0 && Object.values(fp).some((arr: any) => arr?.length > 0);
  const floorPlansByFacing: Record<string, FloorPlan[]> = {};
  const floorPlansByBhk: Record<string, FloorPlan[]> = {};
  if (hasFp) {
    for (const [cat, plans] of Object.entries(fp)) {
      if (!Array.isArray(plans)) continue;
      if (!floorPlansByBhk[cat]) floorPlansByBhk[cat] = [];
      for (const p of plans as any[]) {
        const plan: FloorPlan = {
          name: p.name || cat, size: p.size || "", facing: p.facing || "East",
          carpetArea: p.carpetArea || "", beds: p.beds || 2, baths: p.baths || 2,
          balconies: p.balconies || 1, image: p.image || "", priceRange: p.priceRange || "",
          highlights: p.highlights || [],
        };
        floorPlansByBhk[cat].push(plan);
        const facing = plan.facing;
        if (!floorPlansByFacing[facing]) floorPlansByFacing[facing] = [];
        floorPlansByFacing[facing].push(plan);
      }
    }
  }
  const amenityNames = builder?.amenities || [];
  const amenityIcons = amenityNames.map((name: string) => ({
    name, icon: Object.keys(amenityIconMap).find((k) => name.toLowerCase().includes(k.toLowerCase())) || "Shield",
  }));
  const hasDbData = builder && (builder.builder_name || builder.tagline);
  return {
    name: builder?.builder_name || projectData.name,
    tagline: builder?.tagline || projectData.tagline,
    subtitle: builder?.project_subtitle || builder?.description || projectData.subtitle,
    location: builder?.project_location || projectData.location,
    heroImage: builder?.hero_image || builder?.images?.[0] || projectData.heroImage,
    masterPlanImage: builder?.master_plan_image || projectData.masterPlanImage,
    brochureUrl: builder?.brochure_url || projectData.brochureUrl,
    liveStats: projectData.liveStats,
    about: {
      description: builder?.description || projectData.about.description,
      features: builder?.about_features?.length > 0 ? builder.about_features : projectData.about.features,
      highlights: [
        { label: "Configuration", value: builder?.bhk_types_offered || "—" },
        { label: "Size Range", value: builder?.size_range || "—" },
        { label: "Land Area", value: builder?.land_area || "—" },
        { label: "Total Units", value: builder?.total_units_count?.toString() || "—" },
        { label: "Floors", value: builder?.total_floors_count || "—" },
      ],
    },
    amenities: {
      icons: amenityIcons.length > 0 ? amenityIcons : projectData.amenities.icons,
      images: Array.isArray(builder?.amenity_images) && builder.amenity_images.length > 0
        ? builder.amenity_images.map((img: any) => ({ src: img.url || img.src, label: img.description || "" }))
        : builder?.clubhouse_images?.length > 0
          ? builder.clubhouse_images.map((src: string) => ({ src, label: builder.clubhouse_description || "" }))
          : projectData.amenities.images,
    },
    floorPlansByFacing: Object.keys(floorPlansByFacing).length > 0 ? floorPlansByFacing : projectData.floorPlansByFacing,
    floorPlans: Object.keys(floorPlansByBhk).length > 0 ? floorPlansByBhk : projectData.floorPlans,
    gallery: builder?.gallery_images?.length > 0
      ? builder.gallery_images.map((src: string, i: number) => ({ src, label: `Gallery ${i + 1}` }))
      : projectData.gallery,
    map: {
      lat: builder?.latitude || projectData.map.lat,
      lng: builder?.longitude || projectData.map.lng,
      mapsUrl: builder?.google_maps_link || projectData.map.mapsUrl,
      address: builder?.project_location || projectData.map.address,
    },
    trust: [
      { label: "Total Units", value: builder?.total_units_count?.toString() || "—" },
      { label: "Towers", value: builder?.towers_count?.toString() || "—" },
      { label: "Floors", value: builder?.total_floors_count || "—" },
      { label: "RERA No", value: builder?.rera_number || "—" },
      { label: "Experience", value: builder?.years_of_experience ? `${builder.years_of_experience}+ Years` : "—" },
    ],
    timeline: Array.isArray(builder?.timeline_data) && builder.timeline_data.length > 0 ? builder.timeline_data : projectData.timeline,
    hasTimeline: Array.isArray(builder?.timeline_data) && builder.timeline_data.length > 0 ? true : !hasDbData,
    contact: {
      phone: builder?.phone || projectData.contact.phone,
      whatsapp: builder?.whatsapp || builder?.phone || projectData.contact.whatsapp,
      whatsappMessage: `Hi, I'm interested in ${builder?.builder_name || projectData.name}. Please share more details.`,
      address: builder?.project_location || projectData.contact.address,
    },
    aiBudgetRanges: projectData.aiBudgetRanges,
    aiFacings: Object.keys(floorPlansByFacing).length > 0 ? Object.keys(floorPlansByFacing) : projectData.aiFacings,
  };
}

const NAV_ITEMS = ["Home", "About", "Amenities", "Floor Plans", "Gallery", "Location", "Contact"];
const SECTION_IDS = ["home", "about", "amenities", "floorplans", "gallery", "location", "contact"];

// ── Navy + Blue Professional Theme ──
const StandardMicrosite = ({ builder }: { builder?: any }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const d = useMemo(() => buildData(builder), [builder]);

  const canEdit = user && role === "builder";

  const [activeSection, setActiveSection] = useState("home");
  const [navSolid, setNavSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fpTab, setFpTab] = useState<string>(Object.keys(d.floorPlansByFacing)[0] || "East");
  const [galleryOpen, setGalleryOpen] = useState<string | null>(null);
  const [masterPlanOpen, setMasterPlanOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [aiStep, setAiStep] = useState(0);
  const [aiBhk, setAiBhk] = useState<string | null>(null);
  const [aiBudget, setAiBudget] = useState<string | null>(null);
  const [aiFacing, setAiFacing] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formUnit, setFormUnit] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > 60);
      setShowScrollTop(window.scrollY > 500);
      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(`std-${SECTION_IDS[i]}`);
        if (el && el.getBoundingClientRect().top <= 120) { setActiveSection(SECTION_IDS[i]); break; }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder?.builder_name}%`).limit(20);
      if (data) setProjects(data);
    };
    if (builder?.builder_name) fetch();
  }, [builder?.builder_name]);

  const scrollTo = (id: string) => {
    document.getElementById(`std-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const aiResults = useMemo(() => {
    if (aiStep < 3 || !aiBhk || !aiFacing) return null;
    const facingPlans = d.floorPlansByFacing[aiFacing] || [];
    return facingPlans.filter((p) => p.beds === parseInt(aiBhk));
  }, [aiStep, aiBhk, aiBudget, aiFacing, d.floorPlansByFacing]);

  const handleAiSelect = (step: number, value: string) => {
    if (step === 0) { setAiBhk(value); setAiStep(1); }
    else if (step === 1) { setAiBudget(value); setAiStep(2); }
    else if (step === 2) { setAiFacing(value); setAiStep(3); }
  };
  const resetAi = () => { setAiStep(0); setAiBhk(null); setAiBudget(null); setAiFacing(null); };

  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) { toast.error("Please fill name and phone"); return; }
    toast.success("Thank you! Our team will contact you shortly.");
    setFormName(""); setFormPhone(""); setFormUnit("");
  };

  const handleDownloadBrochure = () => {
    if (d.brochureUrl) window.open(d.brochureUrl, "_blank");
    else generateBrochure(builder || {});
  };

  const facingKeys = Object.keys(d.floorPlansByFacing);
  const bhkCategories = Object.keys(d.floorPlans);

  // Colors: Navy #0f172a, Blue #2563eb, Light Blue #dbeafe, Slate #334155
  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#0f172a]" style={{ scrollBehavior: "smooth" }}>
      {/* ─── STICKY NAV ─── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        navSolid ? "bg-[#0f172a]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {builder?.logo && <img src={builder.logo} alt="" className="h-7 w-7 rounded-lg object-contain" />}
            <span className="font-bold text-base text-white tracking-tight">{d.name}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item, i) => (
              <button key={item} onClick={() => scrollTo(SECTION_IDS[i])}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                  activeSection === SECTION_IDS[i] ? "bg-[#2563eb] text-white" : "text-white/60 hover:text-white hover:bg-white/10")}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {builder?.id && canEdit && (
              <button onClick={() => navigate(`/edit-builder-profile/${builder.id}`)} className="text-white/50 hover:text-white"><Edit className="h-4 w-4" /></button>
            )}
            <Button size="sm" className="rounded-full px-5 bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-medium" onClick={() => scrollTo("contact")}>
              Enquire Now
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden"><button><Menu className="h-5 w-5 text-white" /></button></SheetTrigger>
              <SheetContent side="right" className="bg-[#0f172a] border-[#1e293b] w-64">
                <div className="flex flex-col gap-3 mt-8">
                  {NAV_ITEMS.map((item, i) => (
                    <button key={item} onClick={() => scrollTo(SECTION_IDS[i])}
                      className={cn("text-left text-base py-2 px-3 rounded-lg", activeSection === SECTION_IDS[i] ? "bg-[#2563eb] text-white" : "text-white/60 hover:text-white")}>
                      {item}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* ─── HERO (Split layout) ─── */}
      <section id="std-home" className="relative min-h-[70vh] flex items-center overflow-hidden bg-[#0f172a]">
        <div className="absolute inset-0">
          {d.heroImage && <img src={d.heroImage} alt={d.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-10 items-center w-full">
          <div>
            <Badge className="bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/30 text-xs rounded-full px-4 py-1 mb-4">Standard Builder</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">{d.name}</h1>
            <p className="text-white/50 text-base md:text-lg max-w-lg mb-3">{d.tagline || d.subtitle}</p>
            {builder?.operating_cities?.length > 0 && (
              <div className="flex items-center gap-2 mb-6 text-white/40 text-sm">
                <MapPin className="h-4 w-4 text-[#2563eb]" /> {builder.operating_cities.join(" • ")}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full px-8 bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-semibold shadow-xl shadow-blue-500/20" onClick={() => scrollTo("contact")}>
                Schedule a Visit
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 border-white/20 text-white hover:bg-white/10 bg-transparent" onClick={handleDownloadBrochure}>
                <Download className="h-4 w-4 mr-2" /> Brochure
              </Button>
            </div>
          </div>
          {/* Stats Cards on right */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Projects Completed", value: builder?.completed_projects_count || 0, icon: Building2, color: "text-[#60a5fa]" },
              { label: "Units Delivered", value: (builder?.total_units_delivered || 0).toLocaleString("en-IN"), icon: Home, color: "text-[#34d399]" },
              { label: "Years Experience", value: builder?.years_of_experience ? `${builder.years_of_experience}+` : "—", icon: Clock, color: "text-[#fbbf24]" },
              { label: "Customer Rating", value: builder?.customer_rating ? `${builder.customer_rating}/5` : "—", icon: Star, color: "text-[#f472b6]" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
                  <Icon className={cn("h-5 w-5 mb-2", s.color)} />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-white/40 text-xs mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={() => scrollTo("about")} className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
          <ChevronDown className="h-7 w-7" />
        </button>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="std-about" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">About {d.name}</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-[#e2e8f0] shadow-sm">
                <p className="text-sm text-[#475569] leading-relaxed">{d.about.description}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {d.about.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 bg-[#dbeafe]/50 border border-[#bfdbfe] rounded-xl p-3">
                    <Check className="h-4 w-4 text-[#2563eb] flex-shrink-0" />
                    <span className="text-[#334155] text-xs">{f}</span>
                  </div>
                ))}
              </div>
              {(builder?.about_mission || builder?.about_vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {builder.about_mission && (
                    <div className="p-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]">
                      <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-[#1e40af]"><Target className="h-3.5 w-3.5" /> Mission</h3>
                      <p className="text-xs text-[#3b82f6]">{builder.about_mission}</p>
                    </div>
                  )}
                  {builder.about_vision && (
                    <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                      <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-[#166534]"><Eye className="h-3.5 w-3.5" /> Vision</h3>
                      <p className="text-xs text-[#22c55e]">{builder.about_vision}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Highlights sidebar */}
            <div className="space-y-3">
              {d.about.highlights.filter(h => h.value !== "—").map((h) => (
                <div key={h.label} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <p className="text-lg font-bold text-[#2563eb]">{h.value}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">{h.label}</p>
                </div>
              ))}
            </div>
          </div>
          {builder?.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">{builder.specializations.map((s: string) => <Badge key={s} className="text-xs rounded-full bg-[#dbeafe] text-[#1e40af] border-0 px-3 py-1">{s}</Badge>)}</div>
          )}
        </div>
      </section>

      {/* ─── AI HOME FINDER ─── */}
      <section className="py-16 px-4 bg-[#0f172a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-full px-4 py-1.5 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-[#60a5fa]" />
              <span className="text-[#60a5fa] text-xs tracking-wider uppercase">AI-Powered</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Find Your Perfect Home</h2>
            <p className="text-white/40 text-sm">Answer 3 quick questions to get personalized recommendations</p>
          </div>
          <div className="flex items-center gap-1 mb-6 max-w-md mx-auto">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex-1"><div className={cn("h-1.5 rounded-full transition-all duration-500",
                aiStep > step ? "bg-[#2563eb]" : aiStep === step ? "bg-[#2563eb]/50" : "bg-[#1e293b]"
              )} /></div>
            ))}
          </div>
          <div className="space-y-4">
            {/* Step 0 */}
            <div className={cn("bg-[#1e293b] rounded-2xl p-6 border transition-all", aiStep === 0 ? "border-[#2563eb]/30" : "border-[#334155]", aiStep > 0 ? "opacity-60" : "")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center"><Home className="h-4 w-4 text-[#60a5fa]" /></div>
                  <div><p className="text-white text-sm font-medium">How many bedrooms?</p>
                    {aiBhk && aiStep > 0 && <p className="text-[#60a5fa] text-xs mt-0.5">{aiBhk} BHK selected</p>}</div>
                </div>
                {aiStep > 0 && <button onClick={() => { setAiStep(0); setAiBhk(null); setAiBudget(null); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
              </div>
              {aiStep === 0 && (
                <div className="flex gap-3">
                  {bhkCategories.map((cat) => {
                    const num = cat.replace("BHK", "");
                    return (
                      <button key={cat} onClick={() => handleAiSelect(0, num)}
                        className="flex-1 py-4 rounded-xl text-center bg-[#0f172a] border border-[#334155] hover:border-[#2563eb]/50 hover:bg-[#2563eb]/5 transition-all group">
                        <p className="text-2xl font-bold text-white group-hover:text-[#60a5fa] transition-colors">{num}</p>
                        <p className="text-white/40 text-xs mt-1">BHK</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Step 1 */}
            {aiStep >= 1 && (
              <div className={cn("bg-[#1e293b] rounded-2xl p-6 border transition-all animate-fade-in", aiStep === 1 ? "border-[#2563eb]/30" : "border-[#334155]", aiStep > 1 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-[#60a5fa]" /></div>
                    <div><p className="text-white text-sm font-medium">Budget range?</p>
                      {aiBudget && aiStep > 1 && <p className="text-[#60a5fa] text-xs mt-0.5">{aiBudget}</p>}</div>
                  </div>
                  {aiStep > 1 && <button onClick={() => { setAiStep(1); setAiBudget(null); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
                </div>
                {aiStep === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {d.aiBudgetRanges.map((b) => (
                      <button key={b} onClick={() => handleAiSelect(1, b)}
                        className="py-3 px-4 rounded-xl text-sm font-medium bg-[#0f172a] border border-[#334155] hover:border-[#2563eb]/50 text-white/70 hover:text-white transition-all">{b}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Step 2 */}
            {aiStep >= 2 && (
              <div className={cn("bg-[#1e293b] rounded-2xl p-6 border transition-all animate-fade-in", aiStep === 2 ? "border-[#2563eb]/30" : "border-[#334155]", aiStep > 2 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center"><Compass className="h-4 w-4 text-[#60a5fa]" /></div>
                    <div><p className="text-white text-sm font-medium">Preferred direction?</p>
                      {aiFacing && aiStep > 2 && <p className="text-[#60a5fa] text-xs mt-0.5">{aiFacing} facing</p>}</div>
                  </div>
                  {aiStep > 2 && <button onClick={() => { setAiStep(2); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
                </div>
                {aiStep === 2 && (
                  <div className="grid grid-cols-3 gap-2">
                    {d.aiFacings.map((f) => (
                      <button key={f} onClick={() => handleAiSelect(2, f)}
                        className="py-3 px-3 rounded-xl text-sm font-medium bg-[#0f172a] border border-[#334155] hover:border-[#2563eb]/50 text-white/70 hover:text-white transition-all">{f}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {aiStep === 3 && aiResults !== null && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white text-lg font-medium">{aiResults.length > 0 ? `Found ${aiResults.length} match${aiResults.length > 1 ? "es" : ""}` : "No exact match"}</h3>
                  <p className="text-white/40 text-sm mt-1">{aiBhk} BHK • {aiBudget} • {aiFacing} facing</p>
                </div>
                <button onClick={resetAi} className="flex items-center gap-1.5 text-[#60a5fa] text-sm hover:underline"><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
              </div>
              {aiResults.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiResults.map((p) => <StdFloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} />)}
                </div>
              ) : (
                <div className="bg-[#1e293b] rounded-2xl p-8 text-center border border-[#334155]">
                  <p className="text-white/50 mb-4">Try adjusting your preferences</p>
                  <Button onClick={resetAi} variant="outline" className="rounded-full border-[#2563eb] text-[#60a5fa] hover:bg-[#2563eb]/10"><RotateCcw className="h-4 w-4 mr-2" /> Try Again</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── AMENITIES ─── */}
      <section id="std-amenities" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Amenities & Lifestyle</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {d.amenities.icons.map((a) => {
              const Icon = iconMap[a.icon] || amenityIconMap[a.name] || Shield;
              return (
                <div key={a.name} className="flex items-center gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 hover:border-[#2563eb]/30 hover:shadow-sm transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#dbeafe] flex items-center justify-center"><Icon className="h-4 w-4 text-[#2563eb]" /></div>
                  <span className="text-[#334155] text-sm">{a.name}</span>
                </div>
              );
            })}
          </div>
          {d.amenities.images.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {d.amenities.images.map((a, idx) => (
                <div key={a.src + idx} className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm">
                  <img src={a.src} alt={a.label || "Amenity"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {a.label && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4"><p className="text-white font-semibold text-sm">{a.label}</p></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── MASTER PLAN ─── */}
      {d.masterPlanImage && (
        <>
          <section className="py-16 px-4 bg-[#f0f4f8]">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Master Plan</h2>
              </div>
              <div className="rounded-2xl overflow-hidden border-2 border-[#2563eb]/20 cursor-pointer shadow-lg" onClick={() => setMasterPlanOpen(true)}>
                <img src={d.masterPlanImage} alt="Master Plan" loading="lazy" className="w-full hover:scale-[1.02] transition-transform duration-500" />
              </div>
              <p className="text-[#94a3b8] text-sm text-center mt-4">Click to enlarge</p>
            </div>
          </section>
          <Dialog open={masterPlanOpen} onOpenChange={setMasterPlanOpen}>
            <DialogContent className="max-w-5xl"><img src={d.masterPlanImage} alt="Master Plan" className="w-full rounded-lg" /></DialogContent>
          </Dialog>
        </>
      )}

      {/* ─── PROJECTS ─── */}
      {projects.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Our Projects</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map(p => (
                <div key={p.id} className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="h-40 bg-[#e2e8f0] overflow-hidden">
                    {p.image || p.images?.[0] ? (
                      <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-8 w-8 text-[#cbd5e1]" /></div>}
                  </div>
                  <div className="p-5 space-y-2">
                    <h4 className="font-bold text-sm text-[#0f172a] truncate">{p.name}</h4>
                    <p className="text-xs text-[#94a3b8] flex items-center gap-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                    <div className="flex items-center justify-between">
                      {p.status && <Badge className="text-[10px] bg-[#dbeafe] text-[#1e40af] border-0">{p.status}</Badge>}
                      {p.price_min && <span className="text-xs font-bold text-[#2563eb]">{formatPrice(p.price_min)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FLOOR PLANS ─── */}
      <section id="std-floorplans" className="py-16 px-4 bg-[#f0f4f8]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Floor Plans</h2>
          </div>
          <p className="text-[#94a3b8] text-sm mb-6 ml-4">Browse plans by facing direction</p>
          <div className="flex gap-2 mb-6 flex-wrap">
            {facingKeys.map((facing) => (
              <button key={facing} onClick={() => setFpTab(facing)}
                className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all",
                  fpTab === facing ? "bg-[#2563eb] text-white shadow-md" : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2563eb]/30")}>
                {facing}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(d.floorPlansByFacing[fpTab] || []).map((p) => (
              <StdFloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      {d.gallery.length > 0 && (
        <>
          <section id="std-gallery" className="py-16 px-4 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Gallery</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.gallery.map((g) => (
                  <div key={g.label} className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-sm" onClick={() => setGalleryOpen(g.src)}>
                    <img src={g.src} alt={g.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <Dialog open={!!galleryOpen} onOpenChange={() => setGalleryOpen(null)}>
            <DialogContent className="max-w-4xl">{galleryOpen && <img src={galleryOpen} alt="Gallery" className="w-full rounded-lg" />}</DialogContent>
          </Dialog>
        </>
      )}

      {/* ─── LOCATION ─── */}
      <section id="std-location" className="py-16 px-4 bg-[#f0f4f8]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Location</h2>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-sm mb-4">
            <BuilderLocationMap lat={d.map.lat} lng={d.map.lng} builderName={d.name} height="400px" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[#64748b]"><MapPin className="h-4 w-4 text-[#2563eb]" /><span className="text-sm">{d.map.address}</span></div>
            <a href={d.map.mapsUrl || `https://www.google.com/maps?q=${d.map.lat},${d.map.lng}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]">Open in Google Maps</Button>
            </a>
          </div>
          {builder?.operating_cities?.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-sm">
              <p className="text-sm text-[#64748b] mb-3">Active in {builder.operating_cities.length} {builder.operating_cities.length === 1 ? "city" : "cities"}</p>
              <div className="flex flex-wrap gap-2">
                {builder.operating_cities.map((city: string) => (
                  <div key={city} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dbeafe] text-sm text-[#1e40af] font-medium"><MapPin className="h-3 w-3" /> {city}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="py-10 px-4 bg-[#0f172a]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          {d.trust.filter(t => t.value !== "—").map((t) => (
            <div key={t.label} className="text-center">
              <p className="text-[#60a5fa] text-xl font-bold">{t.value}</p>
              <p className="text-white/40 text-xs mt-1">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── OUR LEGACY ─── */}
      {d.hasTimeline && d.timeline.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-1 h-8 bg-[#2563eb] rounded-full" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Our Legacy</h2>
            </div>
            {/* Horizontal timeline */}
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-[#e2e8f0]" />
              <div className="flex overflow-x-auto gap-8 pb-4 scrollbar-none">
                {d.timeline.map((t: any, i: number) => (
                  <div key={t.year} className="flex-shrink-0 w-56 relative pt-10">
                    <div className="absolute top-4 left-6 w-4 h-4 rounded-full bg-[#2563eb] border-4 border-white shadow" />
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
                      <p className="text-[#2563eb] text-sm font-bold">{t.year}</p>
                      <p className="text-[#0f172a] font-medium text-sm mt-1">{t.title}</p>
                      <p className="text-[#94a3b8] text-xs mt-1">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── RERA & AWARDS ─── */}
      {(builder?.rera_number || builder?.awards?.length > 0) && (
        <section className="py-10 px-4 bg-[#f0f4f8]">
          <div className="max-w-6xl mx-auto space-y-4">
            {builder.rera_number && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-sm text-[#166534]">
                <Shield className="h-4 w-4" /> RERA Verified: <span className="font-mono font-medium">{builder.rera_number}</span>
              </div>
            )}
            {builder.awards?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {builder.awards.map((a: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-xs text-[#92400e]">
                    <Award className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />{a}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── CONTACT ─── */}
      <section id="std-contact" className="py-16 px-4 bg-[#0f172a]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Get In Touch</h2>
          <div className="grid lg:grid-cols-2 gap-10">
            <form onSubmit={handleEnquiry} className="space-y-4">
              <Input placeholder="Your Name" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="bg-[#1e293b] border-[#334155] text-white placeholder:text-white/30 rounded-xl h-12" />
              <Input placeholder="Phone Number" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                className="bg-[#1e293b] border-[#334155] text-white placeholder:text-white/30 rounded-xl h-12" />
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="bg-[#1e293b] border-[#334155] text-white rounded-xl h-12">
                  <SelectValue placeholder="Interested Unit" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="2bhk">2 BHK</SelectItem>
                  <SelectItem value="3bhk">3 BHK</SelectItem>
                  <SelectItem value="notsure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="lg" className="w-full rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                Schedule Visit <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
            <div className="grid sm:grid-cols-3 gap-4">
              <a href={`tel:${d.contact.phone}`} className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[#2563eb]/40 transition-all">
                <Phone className="h-6 w-6 text-[#60a5fa]" /><span className="text-white/80 text-sm">Call Now</span><span className="text-white/40 text-xs">{d.contact.phone}</span>
              </a>
              <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
                className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-green-500/40 transition-all">
                <MessageCircle className="h-6 w-6 text-green-500" /><span className="text-white/80 text-sm">WhatsApp</span><span className="text-white/40 text-xs">{d.contact.whatsapp}</span>
              </a>
              <a href={d.map.mapsUrl || `https://www.google.com/maps?q=${d.map.lat},${d.map.lng}`} target="_blank" rel="noopener noreferrer"
                className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[#2563eb]/40 transition-all cursor-pointer">
                <MapPin className="h-6 w-6 text-[#60a5fa]" /><span className="text-white/80 text-sm">Visit Us</span><span className="text-white/40 text-xs text-center">{d.contact.address}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PHONE STRIP ─── */}
      <div className="bg-[#0f172a] border-y border-[#1e293b] py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
          <Phone className="h-5 w-5 text-[#60a5fa]" />
          <a href={`tel:${d.contact.phone}`} className="text-white text-lg font-medium hover:text-[#60a5fa] transition-colors">{d.contact.phone}</a>
          <span className="text-white/20 mx-2">|</span>
          <MessageCircle className="h-5 w-5 text-green-500" />
          <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
            className="text-white text-lg font-medium hover:text-green-400 transition-colors">{d.contact.whatsapp}</a>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-4 bg-[#0f172a] border-t border-[#1e293b]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#60a5fa] text-lg font-bold">{d.name}</p>
          <p className="text-white/40 text-sm mt-1">{d.tagline}</p>
          <p className="text-white/20 text-xs mt-4">&copy; {new Date().getFullYear()} {d.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── FLOATING CTA ─── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <MessageCircle className="h-5 w-5 text-white" />
        </a>
        <a href={`tel:${d.contact.phone}`}
          className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <Phone className="h-5 w-5 text-white" />
        </a>
      </div>
      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] shadow-sm hover:bg-[#f8fafc]"><ChevronUp className="h-4 w-4" /></button>}
    </div>
  );
};

const StdFloorPlanCard = ({ plan, onEnquire }: { plan: FloorPlan; onEnquire: () => void }) => (
  <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group">
    {plan.image && (
      <div className="aspect-square overflow-hidden bg-[#f8fafc]">
        <img src={plan.image} alt={plan.name} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
      </div>
    )}
    <div className="p-4 border-t border-[#e2e8f0]">
      <p className="text-[#0f172a] font-semibold text-sm mb-1">{plan.name}</p>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#2563eb] font-semibold text-sm">{plan.facing} Facing</p>
        {plan.priceRange && <span className="text-[#2563eb] text-xs font-bold">{plan.priceRange}</span>}
      </div>
      <div className="flex gap-4 text-xs text-[#94a3b8]">
        <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{plan.beds} Bed</span>
        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{plan.baths} Bath</span>
        <span className="flex items-center gap-1"><Square className="h-3 w-3" />{plan.carpetArea || plan.size}</span>
      </div>
      {plan.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {plan.highlights.map((h) => (
            <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[#dbeafe] text-[#1e40af]">{h}</span>
          ))}
        </div>
      )}
      <Button size="sm" className="w-full mt-3 rounded-lg text-xs bg-[#2563eb] text-white hover:bg-[#1d4ed8]" onClick={onEnquire}>
        Enquire About This Plan
      </Button>
    </div>
  </div>
);

export default StandardMicrosite;
