import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { projectData, type FloorPlan } from "@/data/projectData";
import { generateBrochure } from "@/utils/generateBrochure";
import BuilderLocationMap from "./BuilderLocationMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ChevronDown, Menu, Phone, MessageCircle, MapPin, Check,
  Waves, Dumbbell, Building2, TreePine, Baby, Car, Shield, Zap,
  Gamepad2, Users, Footprints, Sparkles, Bed, Bath, Square, Compass,
  Download, ArrowRight, Eye, TrendingUp, AlertTriangle, Clock,
  RotateCcw, Home, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  Waves, Dumbbell, Building2, TreePine, Baby, Car, Shield, Zap,
  Gamepad2, Users, Footprints, Sparkles,
};

const amenityIconMap: Record<string, any> = {
  "Swimming Pool": Waves, "Gym": Dumbbell, "Parking": Car, "Garden": TreePine,
  "Security": Shield, "Wi-Fi": Zap, "AC": Zap, "Water Supply": Waves,
  "Power Backup": Zap, "Kids Play Area": Baby, "Pet Friendly": Baby,
  "Landscaping": TreePine, "Game Room": Gamepad2, "Library": Building2,
  "Cafeteria": Users, "Clubhouse": Building2, "Gymnasium": Dumbbell,
  "Gardens": TreePine, "Jogging Track": Footprints, "Meditation Zone": Sparkles,
  "Community Hall": Users, "Indoor Games": Gamepad2,
};

const statIconMap: Record<string, any> = {
  eye: Eye, trending: TrendingUp, alert: AlertTriangle, clock: Clock,
};

// Build data object from builder profile, falling back to static projectData
function buildData(builder: any) {
  const fp = builder?.floor_plans_data || {};
  const hasFp = Object.keys(fp).length > 0 && Object.values(fp).some((arr: any) => arr?.length > 0);

  // Build floor plans by facing from DB data
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
    name, icon: Object.keys(amenityIconMap).find((k) => name.toLowerCase().includes(k.toLowerCase())) ? name : name,
  }));

  const hasDbData = builder && (builder.builder_name || builder.tagline);

  return {
    name: builder?.builder_name || projectData.name,
    tagline: builder?.tagline || projectData.tagline,
    subtitle: builder?.project_subtitle || builder?.description || projectData.subtitle,
    location: builder?.project_location || projectData.location,
    heroImage: builder?.hero_image || (builder?.images?.[0]) || projectData.heroImage,
    masterPlanImage: builder?.master_plan_image || projectData.masterPlanImage,
    brochureUrl: builder?.brochure_url || projectData.brochureUrl,
    liveStats: projectData.liveStats,
    about: {
      description: builder?.description || projectData.about.description,
      features: builder?.about_features?.length > 0 ? builder.about_features : projectData.about.features,
      highlights: [
        { label: "Configuration", value: builder?.bhk_types_offered || projectData.about.highlights[0]?.value || "—" },
        { label: "Size Range", value: builder?.size_range || projectData.about.highlights[1]?.value || "—" },
        { label: "Land Area", value: builder?.land_area || projectData.about.highlights[2]?.value || "—" },
        { label: "Total Units", value: builder?.total_units_count?.toString() || projectData.about.highlights[3]?.value || "—" },
        { label: "Floors", value: builder?.total_floors_count || projectData.about.highlights[4]?.value || "—" },
      ],
    },
    amenities: {
      icons: amenityIcons.length > 0 ? amenityIcons.map((a: any) => ({ name: a.name, icon: Object.keys(iconMap).find((k) => a.name.toLowerCase().includes(k.toLowerCase())) || "Shield" })) : projectData.amenities.icons,
      images: Array.isArray(builder?.amenity_images) && builder.amenity_images.length > 0
        ? builder.amenity_images.map((img: any) => ({ src: img.url || img.src, label: img.description || "", desc: "" }))
        : builder?.clubhouse_images?.length > 0
          ? builder.clubhouse_images.map((src: string, i: number) => ({ src, label: builder.clubhouse_description || "", desc: "" }))
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
      { label: "Total Units", value: builder?.total_units_count?.toString() || "480" },
      { label: "Towers", value: builder?.towers_count?.toString() || "4" },
      { label: "Floors", value: builder?.total_floors_count || "G+25" },
      { label: "RERA No", value: builder?.rera_number || "—" },
      { label: "Experience", value: builder?.years_of_experience ? `${builder.years_of_experience}+ Years` : "25+ Years" },
    ],
    timeline: Array.isArray(builder?.timeline_data) && builder.timeline_data.length > 0
      ? builder.timeline_data
      : projectData.timeline,
    hasTimeline: Array.isArray(builder?.timeline_data) && builder.timeline_data.length > 0
      ? true
      : !hasDbData, // show static only if no DB data
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

const NAV_ITEMS = ["Home", "About", "Amenities", "Master Plan", "Floor Plans", "Gallery", "Location", "Contact"];
const SECTION_IDS = ["home", "about", "amenities", "masterplan", "floorplans", "gallery", "location", "contact"];

const LuxuryMicrosite = ({ builder }: { builder?: any }) => {
  const navigate = useNavigate();
  const d = useMemo(() => buildData(builder), [builder]);

  const [activeSection, setActiveSection] = useState("home");
  const [navSolid, setNavSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fpTab, setFpTab] = useState<string>(Object.keys(d.floorPlansByFacing)[0] || "East");
  const [galleryOpen, setGalleryOpen] = useState<string | null>(null);
  const [masterPlanOpen, setMasterPlanOpen] = useState(false);

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
      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTION_IDS[i]);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(SECTION_IDS[i]);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const aiResults = useMemo(() => {
    if (aiStep < 3 || !aiBhk || !aiFacing) return null;
    const facingPlans = d.floorPlansByFacing[aiFacing as keyof typeof d.floorPlansByFacing] || [];
    const bhkNum = parseInt(aiBhk);
    return facingPlans.filter((p) => p.beds === bhkNum);
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

  const facingKeys = Object.keys(d.floorPlansByFacing);
  const bhkCategories = Object.keys(d.floorPlans);

  return (
    <div className="luxury-dark bg-[hsl(220,60%,8%)] min-h-screen text-white" style={{ scrollBehavior: "smooth" }}>
      {/* STICKY NAV */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        navSolid ? "bg-[hsl(220,60%,8%)]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <span className="font-serif italic text-xl text-[hsl(43,74%,52%)]">{d.name}</span>
          <div className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item, i) => (
              <button key={item} onClick={() => scrollTo(SECTION_IDS[i])}
                className={cn("text-sm transition-colors", activeSection === SECTION_IDS[i] ? "text-[hsl(43,74%,52%)]" : "text-white/70 hover:text-white")}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {builder?.id && (
              <button onClick={() => navigate(`/edit-builder-profile/${builder.id}`)} className="text-white/50 hover:text-white/80">
                <Edit className="h-4 w-4" />
              </button>
            )}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <button><Menu className="h-6 w-6 text-white" /></button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[hsl(220,60%,8%)] border-[hsl(215,28%,22%)] w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {NAV_ITEMS.map((item, i) => (
                    <button key={item} onClick={() => scrollTo(SECTION_IDS[i])}
                      className={cn("text-left text-lg py-2", activeSection === SECTION_IDS[i] ? "text-[hsl(43,74%,52%)]" : "text-white/70")}>
                      {item}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        {d.heroImage && <img src={d.heroImage} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,60%,8%)]/70 via-[hsl(220,60%,8%)]/50 to-[hsl(220,60%,8%)]/90" />
        <div className="relative z-10 text-center max-w-3xl px-4">
          <p className="text-[hsl(43,74%,52%)] text-sm tracking-[0.3em] uppercase mb-4">Premium Residences</p>
          <h1 className="font-serif italic text-4xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">{d.tagline}</h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8">{d.subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gold" size="lg" className="rounded-full px-8" onClick={() => scrollTo("contact")}>
              Book a Private Tour
            </Button>
            {d.brochureUrl ? (
              <a href={d.brochureUrl} download>
                <Button variant="goldOutline" size="lg" className="rounded-full px-8">
                  <Download className="h-4 w-4 mr-2" /> Download Brochure
                </Button>
              </a>
            ) : (
              <Button variant="goldOutline" size="lg" className="rounded-full px-8" onClick={() => generateBrochure(builder || {})}>
                <Download className="h-4 w-4 mr-2" /> Download Brochure
              </Button>
            )}
          </div>
        <button onClick={() => scrollTo("livestats")} className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <ChevronDown className="h-8 w-8" />
        </button>
      </section>

      {/* LIVE STATS */}
      <section id="livestats" className="bg-[hsl(220,60%,8%)] border-y border-[hsl(43,74%,52%)]/10">
        <div className="max-w-6xl mx-auto px-4 py-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[hsl(215,28%,22%)]">
            {d.liveStats.map((s, i) => {
              const Icon = statIconMap[s.icon];
              return (
                <div key={i} className="flex items-center gap-3 py-4 px-4 md:px-6 group hover:bg-[hsl(215,28%,17%)]/40 transition-colors">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    s.color === "green" ? "bg-green-500/10" : s.color === "amber" ? "bg-amber-500/10" : "bg-red-500/10"
                  )}>
                    {Icon && <Icon className={cn("h-4 w-4", s.color === "green" ? "text-green-400" : s.color === "amber" ? "text-amber-400" : "text-red-400")} />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold leading-tight", s.color === "green" ? "text-green-400" : s.color === "amber" ? "text-amber-400" : "text-red-400")}>
                      {s.text.split(" ").slice(0, 2).join(" ")}
                    </p>
                    <p className="text-white/40 text-xs truncate">{s.text.split(" ").slice(2).join(" ")}</p>
                  </div>
                  <span className={cn("ml-auto h-2 w-2 rounded-full animate-pulse flex-shrink-0",
                    s.color === "green" ? "bg-green-500" : s.color === "amber" ? "bg-amber-500" : "bg-red-500"
                  )} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-6">About {d.name}</h2>
          <p className="text-white/70 max-w-3xl text-base leading-relaxed mb-10">{d.about.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {d.about.features.map((f) => (
              <div key={f} className="flex items-center gap-3 bg-[hsl(215,28%,17%)] rounded-xl p-4">
                <Check className="h-5 w-5 text-[hsl(43,74%,52%)] flex-shrink-0" />
                <span className="text-white/90 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {d.about.highlights.map((h) => (
              <div key={h.label} className="bg-[hsl(220,39%,11%)] border border-[hsl(215,28%,22%)] rounded-xl p-4 text-center">
                <p className="text-[hsl(43,74%,52%)] text-xl font-bold">{h.value}</p>
                <p className="text-white/50 text-xs mt-1">{h.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI HOME FINDER */}
      <section className="py-20 px-4 bg-[hsl(220,39%,11%)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-[hsl(43,74%,52%)]/10 border border-[hsl(43,74%,52%)]/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(43,74%,52%)]" />
              <span className="text-[hsl(43,74%,52%)] text-xs tracking-wider uppercase">AI-Powered</span>
            </div>
            <h2 className="font-serif italic text-3xl md:text-4xl text-white mb-2">Find Your Perfect Home</h2>
            <p className="text-white/50 text-sm">Tell us your preferences and we'll find your ideal floor plan</p>
          </div>
          <div className="flex items-center gap-1 mb-8 max-w-md mx-auto">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex-1"><div className={cn("h-1.5 rounded-full transition-all duration-500",
                aiStep > step ? "bg-[hsl(43,74%,52%)]" : aiStep === step ? "bg-[hsl(43,74%,52%)]/50" : "bg-[hsl(215,28%,22%)]"
              )} /></div>
            ))}
          </div>
          <div className="space-y-4">
            {/* Step 0: BHK */}
            <div className={cn("bg-[hsl(215,28%,17%)] rounded-2xl p-6 border transition-all", aiStep === 0 ? "border-[hsl(43,74%,52%)]/30" : "border-[hsl(215,28%,22%)]", aiStep > 0 ? "opacity-60" : "")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[hsl(43,74%,52%)]/10 flex items-center justify-center"><Home className="h-4 w-4 text-[hsl(43,74%,52%)]" /></div>
                  <div>
                    <p className="text-white text-sm font-medium">How many bedrooms?</p>
                    {aiBhk && aiStep > 0 && <p className="text-[hsl(43,74%,52%)] text-xs mt-0.5">{aiBhk} BHK selected</p>}
                  </div>
                </div>
                {aiStep > 0 && <button onClick={() => { setAiStep(0); setAiBhk(null); setAiBudget(null); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
              </div>
              {aiStep === 0 && (
                <div className="flex gap-3">
                  {bhkCategories.map((cat) => {
                    const num = cat.replace("BHK", "");
                    return (
                      <button key={cat} onClick={() => handleAiSelect(0, num)}
                        className="flex-1 py-4 rounded-xl text-center bg-[hsl(220,39%,11%)] border border-[hsl(215,28%,22%)] hover:border-[hsl(43,74%,52%)]/50 hover:bg-[hsl(43,74%,52%)]/5 transition-all group">
                        <p className="text-2xl font-bold text-white group-hover:text-[hsl(43,74%,52%)] transition-colors">{num}</p>
                        <p className="text-white/40 text-xs mt-1">BHK</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Step 1: Budget */}
            {aiStep >= 1 && (
              <div className={cn("bg-[hsl(215,28%,17%)] rounded-2xl p-6 border transition-all animate-fade-in", aiStep === 1 ? "border-[hsl(43,74%,52%)]/30" : "border-[hsl(215,28%,22%)]", aiStep > 1 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(43,74%,52%)]/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-[hsl(43,74%,52%)]" /></div>
                    <div>
                      <p className="text-white text-sm font-medium">Budget range?</p>
                      {aiBudget && aiStep > 1 && <p className="text-[hsl(43,74%,52%)] text-xs mt-0.5">{aiBudget}</p>}
                    </div>
                  </div>
                  {aiStep > 1 && <button onClick={() => { setAiStep(1); setAiBudget(null); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
                </div>
                {aiStep === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {d.aiBudgetRanges.map((b) => (
                      <button key={b} onClick={() => handleAiSelect(1, b)}
                        className="py-3 px-4 rounded-xl text-sm font-medium bg-[hsl(220,39%,11%)] border border-[hsl(215,28%,22%)] hover:border-[hsl(43,74%,52%)]/50 hover:bg-[hsl(43,74%,52%)]/5 text-white/70 hover:text-white transition-all">{b}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Step 2: Facing */}
            {aiStep >= 2 && (
              <div className={cn("bg-[hsl(215,28%,17%)] rounded-2xl p-6 border transition-all animate-fade-in", aiStep === 2 ? "border-[hsl(43,74%,52%)]/30" : "border-[hsl(215,28%,22%)]", aiStep > 2 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(43,74%,52%)]/10 flex items-center justify-center"><Compass className="h-4 w-4 text-[hsl(43,74%,52%)]" /></div>
                    <div>
                      <p className="text-white text-sm font-medium">Preferred direction?</p>
                      {aiFacing && aiStep > 2 && <p className="text-[hsl(43,74%,52%)] text-xs mt-0.5">{aiFacing} facing</p>}
                    </div>
                  </div>
                  {aiStep > 2 && <button onClick={() => { setAiStep(2); setAiFacing(null); }} className="text-white/40 hover:text-white/70 text-xs">Change</button>}
                </div>
                {aiStep === 2 && (
                  <div className="grid grid-cols-3 gap-2">
                    {d.aiFacings.map((f) => (
                      <button key={f} onClick={() => handleAiSelect(2, f)}
                        className="py-3 px-3 rounded-xl text-sm font-medium bg-[hsl(220,39%,11%)] border border-[hsl(215,28%,22%)] hover:border-[hsl(43,74%,52%)]/50 hover:bg-[hsl(43,74%,52%)]/5 text-white/70 hover:text-white transition-all">{f}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* AI Results */}
          {aiStep === 3 && aiResults !== null && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white text-lg font-medium">
                    {aiResults.length > 0 ? `We found ${aiResults.length} perfect match${aiResults.length > 1 ? "es" : ""}` : "No exact match"}
                  </h3>
                  <p className="text-white/40 text-sm mt-1">{aiBhk} BHK • {aiBudget} • {aiFacing} facing</p>
                </div>
                <button onClick={resetAi} className="flex items-center gap-1.5 text-[hsl(43,74%,52%)] text-sm hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Start over
                </button>
              </div>
              {aiResults.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiResults.map((p) => <FloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} showHighlights />)}
                </div>
              ) : (
                <div className="bg-[hsl(215,28%,17%)] rounded-2xl p-8 text-center border border-[hsl(215,28%,22%)]">
                  <p className="text-white/50 mb-4">Try adjusting your preferences</p>
                  <Button variant="goldOutline" onClick={resetAi} className="rounded-full"><RotateCcw className="h-4 w-4 mr-2" /> Try Again</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* AMENITIES */}
      <section id="amenities" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-10">World-Class Amenities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
            {d.amenities.icons.map((a) => {
              const Icon = iconMap[a.icon] || amenityIconMap[a.name] || Shield;
              return (
                <div key={a.name} className="flex items-center gap-3 bg-[hsl(215,28%,17%)] rounded-xl p-4 hover:border-[hsl(43,74%,52%)]/30 border border-transparent transition-all">
                  <Icon className="h-5 w-5 text-[hsl(43,74%,52%)]" />
                  <span className="text-white/80 text-sm">{a.name}</span>
                </div>
              );
            })}
          </div>
          {d.amenities.images.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {d.amenities.images.map((a, idx) => (
                <div key={a.src + idx} className="group relative rounded-xl overflow-hidden aspect-[4/3]">
                  <img src={a.src} alt={a.label || `Amenity`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {a.label && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white font-semibold text-sm">{a.label}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MASTER PLAN */}
      {d.masterPlanImage && (
        <>
          <section id="masterplan" className="py-20 px-4 bg-[hsl(220,39%,11%)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-8">Master Plan</h2>
              <div className="border-2 border-[hsl(43,74%,52%)]/30 rounded-2xl overflow-hidden cursor-pointer" onClick={() => setMasterPlanOpen(true)}>
                <img src={d.masterPlanImage} alt="Master Plan" loading="lazy" className="w-full hover:scale-[1.02] transition-transform duration-500" />
              </div>
              <p className="text-white/40 text-sm text-center mt-4">Click to enlarge</p>
            </div>
          </section>
          <Dialog open={masterPlanOpen} onOpenChange={setMasterPlanOpen}>
            <DialogContent className="max-w-5xl bg-[hsl(220,60%,8%)] border-[hsl(215,28%,22%)]">
              <img src={d.masterPlanImage} alt="Master Plan" className="w-full rounded-lg" />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* FLOOR PLANS */}
      <section id="floorplans" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-2">Floor Plans</h2>
          <p className="text-white/50 text-sm mb-8">Browse plans by facing direction</p>
          <div className="flex gap-2 mb-8 flex-wrap">
            {facingKeys.map((facing) => (
              <button key={facing} onClick={() => setFpTab(facing)}
                className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all",
                  fpTab === facing ? "bg-[hsl(43,74%,52%)] text-[hsl(220,60%,8%)]" : "bg-[hsl(215,28%,17%)] text-white/70 hover:text-white")}>
                {facing}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(d.floorPlansByFacing[fpTab as keyof typeof d.floorPlansByFacing] || []).map((p) => (
              <FloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} showHighlights />
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      {d.gallery.length > 0 && (
        <>
          <section id="gallery" className="py-20 px-4 bg-[hsl(220,39%,11%)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-8">Gallery</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.gallery.map((g) => (
                  <div key={g.label} className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer" onClick={() => setGalleryOpen(g.src)}>
                    <img src={g.src} alt={g.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <span className="text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">{g.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <Dialog open={!!galleryOpen} onOpenChange={() => setGalleryOpen(null)}>
            <DialogContent className="max-w-4xl bg-[hsl(220,60%,8%)] border-[hsl(215,28%,22%)]">
              {galleryOpen && <img src={galleryOpen} alt="Gallery" className="w-full rounded-lg" />}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* LOCATION */}
      <section id="location" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-8">Location</h2>
          <div className="rounded-2xl overflow-hidden border border-[hsl(215,28%,22%)] mb-4">
            <BuilderLocationMap lat={d.map.lat} lng={d.map.lng} builderName={d.name} height="400px" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-4 w-4 text-[hsl(43,74%,52%)]" />
              <span className="text-sm">{d.map.address}</span>
            </div>
            <a href={d.map.mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="goldOutline" size="sm" className="rounded-full">Open in Google Maps</Button>
            </a>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-12 px-4 bg-[hsl(220,39%,11%)] border-y border-[hsl(215,28%,22%)]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          {d.trust.map((t) => (
            <div key={t.label} className="text-center">
              <p className="text-[hsl(43,74%,52%)] text-xl font-bold">{t.value}</p>
              <p className="text-white/50 text-xs mt-1">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TIMELINE / OUR LEGACY - only shown when data exists */}
      {d.hasTimeline && d.timeline.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-10">Our Legacy</h2>
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[hsl(215,28%,22%)]" />
              {d.timeline.map((t: any, i: number) => (
                <div key={t.year} className={cn("relative flex mb-10 last:mb-0", i % 2 === 0 ? "md:justify-start" : "md:justify-end")}>
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[hsl(43,74%,52%)] mt-1.5" />
                  <div className={cn("ml-10 md:ml-0 md:w-[45%] bg-[hsl(215,28%,17%)] rounded-xl p-5 border border-[hsl(215,28%,22%)]",
                    i % 2 === 0 ? "md:mr-auto md:pr-8" : "md:ml-auto md:pl-8")}>
                    <p className="text-[hsl(43,74%,52%)] text-sm font-bold">{t.year}</p>
                    <p className="text-white font-medium mt-1">{t.title}</p>
                    <p className="text-white/50 text-sm mt-1">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" className="py-20 px-4 bg-[hsl(220,39%,11%)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-[hsl(43,74%,52%)] mb-8">Schedule Your Visit</h2>
          <div className="grid lg:grid-cols-2 gap-10">
            <form onSubmit={handleEnquiry} className="space-y-4">
              <Input placeholder="Your Name" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="bg-[hsl(215,28%,17%)] border-[hsl(215,28%,22%)] text-white placeholder:text-white/30 rounded-xl h-12" />
              <Input placeholder="Phone Number" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                className="bg-[hsl(215,28%,17%)] border-[hsl(215,28%,22%)] text-white placeholder:text-white/30 rounded-xl h-12" />
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="bg-[hsl(215,28%,17%)] border-[hsl(215,28%,22%)] text-white rounded-xl h-12">
                  <SelectValue placeholder="Interested Unit" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(215,28%,17%)] border-[hsl(215,28%,22%)]">
                  <SelectItem value="2bhk">2 BHK</SelectItem>
                  <SelectItem value="3bhk">3 BHK</SelectItem>
                  <SelectItem value="notsure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="gold" size="lg" className="w-full rounded-xl">
                Schedule Visit <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
            <div className="grid sm:grid-cols-3 gap-4">
              <a href={`tel:${d.contact.phone}`} className="bg-[hsl(215,28%,17%)] border border-[hsl(215,28%,22%)] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[hsl(43,74%,52%)]/40 transition-all">
                <Phone className="h-6 w-6 text-[hsl(43,74%,52%)]" />
                <span className="text-white/80 text-sm text-center">Call Now</span>
                <span className="text-white/50 text-xs">{d.contact.phone}</span>
              </a>
              <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
                className="bg-[hsl(215,28%,17%)] border border-[hsl(215,28%,22%)] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-green-500/40 transition-all">
                <MessageCircle className="h-6 w-6 text-green-500" />
                <span className="text-white/80 text-sm text-center">WhatsApp</span>
                <span className="text-white/50 text-xs">{d.contact.whatsapp}</span>
              </a>
              <a href={d.map.mapsUrl || `https://www.google.com/maps?q=${d.map.lat},${d.map.lng}`} target="_blank" rel="noopener noreferrer"
                className="bg-[hsl(215,28%,17%)] border border-[hsl(215,28%,22%)] rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[hsl(43,74%,52%)]/40 transition-all cursor-pointer">
                <MapPin className="h-6 w-6 text-[hsl(43,74%,52%)]" />
                <span className="text-white/80 text-sm text-center">Visit Us</span>
                <span className="text-white/50 text-xs text-center">{d.contact.address}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PHONE STRIP */}
      <div className="bg-[hsl(220,60%,8%)] border-y border-[hsl(215,28%,22%)] py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
          <Phone className="h-5 w-5 text-[hsl(43,74%,52%)]" />
          <a href={`tel:${d.contact.phone}`} className="text-white text-lg font-medium tracking-wide hover:text-[hsl(43,74%,52%)] transition-colors">{d.contact.phone}</a>
          <span className="text-white/30 mx-2">|</span>
          <MessageCircle className="h-5 w-5 text-green-500" />
          <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
            className="text-white text-lg font-medium tracking-wide hover:text-green-400 transition-colors">{d.contact.whatsapp}</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-[hsl(215,28%,22%)]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-serif italic text-[hsl(43,74%,52%)] text-lg">{d.name}</p>
          <p className="text-white/40 text-sm mt-1">{d.tagline}</p>
          <p className="text-white/30 text-xs mt-4">&copy; {new Date().getFullYear()} {d.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* FLOATING CTA */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <MessageCircle className="h-5 w-5 text-white" />
        </a>
        <a href={`tel:${d.contact.phone}`}
          className="w-12 h-12 rounded-full bg-[hsl(43,74%,52%)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <Phone className="h-5 w-5 text-[hsl(220,60%,8%)]" />
        </a>
      </div>
    </div>
  );
};

const FloorPlanCard = ({ plan, onEnquire, showHighlights = false }: { plan: FloorPlan; onEnquire: () => void; showHighlights?: boolean }) => (
  <div className="bg-[hsl(215,28%,17%)] rounded-xl border border-[hsl(215,28%,22%)] overflow-hidden hover:border-[hsl(43,74%,52%)]/30 hover:-translate-y-1 transition-all group">
    {plan.image && (
      <div className="aspect-square overflow-hidden relative bg-[hsl(220,60%,8%)]">
        <img src={plan.image} alt={plan.name} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
      </div>
    )}
    <div className="p-4 border-t border-[hsl(215,28%,22%)]">
      <p className="text-white font-medium text-sm mb-1">{plan.name}</p>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[hsl(43,74%,52%)] font-semibold text-sm">{plan.facing} Facing</p>
        {plan.priceRange && <span className="text-[hsl(43,74%,52%)] text-xs font-semibold">{plan.priceRange}</span>}
      </div>
      <div className="flex gap-4 text-xs text-white/60">
        <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{plan.beds} Bed</span>
        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{plan.baths} Bath</span>
        <span className="flex items-center gap-1"><Square className="h-3 w-3" />{plan.carpetArea || plan.size}</span>
      </div>
      {showHighlights && plan.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {plan.highlights.map((h) => (
            <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(43,74%,52%)]/10 text-[hsl(43,74%,52%)] border border-[hsl(43,74%,52%)]/20">{h}</span>
          ))}
        </div>
      )}
      <Button variant="goldOutline" size="sm" className="w-full mt-3 rounded-lg text-xs" onClick={onEnquire}>
        Enquire About This Plan
      </Button>
    </div>
  </div>
);

export default LuxuryMicrosite;
