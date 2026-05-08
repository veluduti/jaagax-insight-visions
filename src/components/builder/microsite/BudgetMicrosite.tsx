import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { projectData, type FloorPlan } from "@/data/projectData";
import { generateBrochure } from "@/utils/generateBrochure";
import BuilderLocationMap from "./BuilderLocationMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Phone, MessageCircle, MapPin, Check, Mail, Globe,
  Shield, Star, Building2, TreePine, Baby, Car, Zap, Dumbbell, Waves,
  Gamepad2, Users, Footprints, Sparkles, Bed, Bath, Square, Compass,
  Download, ArrowRight, Eye, TrendingUp, Clock, RotateCcw, Home, Edit,
  Award, Target, ChevronUp, ChevronDown, X
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

// ── White + Soft Green Light Theme ──
const BudgetMicrosite = ({ builder }: { builder?: any }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const d = useMemo(() => buildData(builder), [builder]);

  const canEdit = user && role === "builder";

  const [activeTab, setActiveTab] = useState("about");
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
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
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
    document.getElementById(`bdg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const startingPrice = builder?.price_range_min ? formatPrice(builder.price_range_min) : null;

  // Colors: White #ffffff, Soft Green #16a34a, Light Mint #f0fdf4, Emerald text #065f46
  return (
    <div className="min-h-screen bg-white text-[#1a2e1a]" style={{ scrollBehavior: "smooth" }}>
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {builder?.logo && <img src={builder.logo} alt="" className="h-7 w-7 rounded-lg object-contain"  loading="lazy" decoding="async" />}
            <span className="font-bold text-sm text-[#065f46] tracking-tight">{d.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {builder?.id && canEdit && (
              <button onClick={() => navigate(`/edit-builder-profile/${builder.id}`)} className="text-[#9ca3af] hover:text-[#374151]"><Edit className="h-4 w-4" /></button>
            )}
            <Button size="sm" className="rounded-full px-4 bg-[#16a34a] text-white hover:bg-[#15803d] text-xs" onClick={() => window.open(`tel:${d.contact.phone}`)}>
              <Phone className="h-3.5 w-3.5 mr-1" /> Call
            </Button>
          </div>
        </div>
      </header>

      {/* ─── HERO (Card-based compact) ─── */}
      <section className="relative overflow-hidden">
        <div className="h-[40vh] min-h-[280px] relative">
          {d.heroImage ? (
            <img src={d.heroImage} alt={d.name} className="absolute inset-0 w-full h-full object-cover"  loading="lazy" decoding="async" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#16a34a] to-[#059669]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        </div>
        {/* Floating hero card */}
        <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-white rounded-3xl border border-[#e5e7eb] shadow-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Badge className="bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-xs rounded-full px-3 py-1 mb-2">Budget Friendly</Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-[#111827] leading-tight">{d.name}</h1>
                {d.tagline && <p className="text-[#6b7280] text-sm mt-1 max-w-md">{d.tagline}</p>}
                <div className="flex items-center gap-4 mt-3">
                  {builder?.operating_cities?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#9ca3af]"><MapPin className="h-3 w-3 text-[#16a34a]" />{builder.operating_cities.join(", ")}</span>
                  )}
                  {builder?.customer_rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#9ca3af]"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{builder.customer_rating}/5</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {startingPrice && (
                  <div className="text-right">
                    <p className="text-[10px] text-[#9ca3af]">Starting from</p>
                    <p className="text-2xl font-bold text-[#16a34a]">{startingPrice}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="rounded-full px-5 bg-[#16a34a] text-white hover:bg-[#15803d] text-xs" onClick={() => scrollTo("contact")}>
                    Get Quote
                  </Button>
                  <Button variant="outline" className="rounded-full px-5 border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] text-xs" onClick={handleDownloadBrochure}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Brochure
                  </Button>
                </div>
              </div>
            </div>
            {/* Mini stats row */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#f3f4f6]">
              {[
                { label: "Projects", value: builder?.completed_projects_count || 0, color: "text-[#16a34a]" },
                { label: "Units", value: (builder?.total_units_delivered || 0).toLocaleString("en-IN"), color: "text-[#0891b2]" },
                { label: "Years", value: builder?.years_of_experience ? `${builder.years_of_experience}+` : "—", color: "text-[#d97706]" },
                { label: "Cities", value: builder?.operating_cities?.length || 0, color: "text-[#7c3aed]" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-[#9ca3af]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TAB NAV ─── */}
      <nav className="sticky top-14 z-40 bg-white border-b border-[#e5e7eb] mt-6">
        <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center h-11 gap-1 px-4 min-w-max">
            {["About", "Amenities", "Projects", "Floor Plans", "Gallery", "Location", "Contact"].map(tab => {
              const id = tab.toLowerCase().replace(" ", "");
              return (
                <button key={tab} onClick={() => { setActiveTab(id); scrollTo(id); }}
                  className={cn("px-4 py-2 text-xs font-medium rounded-full transition-all whitespace-nowrap",
                    activeTab === id ? "bg-[#16a34a] text-white" : "text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]")}>
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ─── CONTENT ─── */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ─── ABOUT ─── */}
        <section id="bdg-about">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><Building2 className="h-4 w-4 text-[#16a34a]" /></div>
            <h2 className="text-xl font-bold text-[#111827]">About {d.name}</h2>
          </div>
          <div className="bg-[#f9fafb] rounded-2xl border border-[#e5e7eb] p-5 mb-4">
            <p className="text-sm text-[#4b5563] leading-relaxed">{d.about.description}</p>
          </div>
          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {d.about.features.map((f) => (
              <div key={f} className="flex items-center gap-1.5 bg-[#f0fdf4] border border-[#dcfce7] rounded-full px-3 py-1.5">
                <Check className="h-3 w-3 text-[#16a34a]" />
                <span className="text-[#065f46] text-xs">{f}</span>
              </div>
            ))}
          </div>
          {/* Highlight cards */}
          <div className="grid grid-cols-5 gap-2">
            {d.about.highlights.filter(h => h.value !== "—").map((h) => (
              <div key={h.label} className="bg-white border border-[#e5e7eb] rounded-xl p-3 text-center shadow-sm">
                <p className="text-sm font-bold text-[#16a34a]">{h.value}</p>
                <p className="text-[9px] text-[#9ca3af] mt-0.5">{h.label}</p>
              </div>
            ))}
          </div>
          {(builder?.about_mission || builder?.about_vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {builder.about_mission && (
                <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#dcfce7]">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-[#065f46]"><Target className="h-3.5 w-3.5" /> Mission</h3>
                  <p className="text-xs text-[#16a34a]">{builder.about_mission}</p>
                </div>
              )}
              {builder.about_vision && (
                <div className="p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0]">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-[#047857]"><Eye className="h-3.5 w-3.5" /> Vision</h3>
                  <p className="text-xs text-[#059669]">{builder.about_vision}</p>
                </div>
              )}
            </div>
          )}
          {builder?.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">{builder.specializations.map((s: string) => <Badge key={s} className="text-xs rounded-full bg-[#f0fdf4] text-[#065f46] border-[#dcfce7] px-3 py-1">{s}</Badge>)}</div>
          )}
        </section>

        {/* ─── AI HOME FINDER ─── */}
        <section className="bg-[#f0fdf4] rounded-3xl border border-[#dcfce7] p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white border border-[#dcfce7] rounded-full px-4 py-1.5 mb-3 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#16a34a]" />
              <span className="text-[#16a34a] text-xs font-medium">AI Home Finder</span>
            </div>
            <h2 className="text-xl font-bold text-[#111827] mb-1">Find Your Dream Home</h2>
            <p className="text-[#6b7280] text-xs">3 quick questions to find the perfect match</p>
          </div>
          <div className="flex items-center gap-1 mb-5 max-w-sm mx-auto">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex-1"><div className={cn("h-1.5 rounded-full transition-all duration-500",
                aiStep > step ? "bg-[#16a34a]" : aiStep === step ? "bg-[#16a34a]/40" : "bg-[#d1d5db]"
              )} /></div>
            ))}
          </div>
          <div className="space-y-3 max-w-lg mx-auto">
            <div className={cn("bg-white rounded-2xl p-5 border transition-all", aiStep === 0 ? "border-[#16a34a]/30 shadow-md" : "border-[#e5e7eb]", aiStep > 0 ? "opacity-60" : "")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center"><Home className="h-3.5 w-3.5 text-[#16a34a]" /></div>
                  <div><p className="text-sm font-medium text-[#111827]">Bedrooms?</p>
                    {aiBhk && aiStep > 0 && <p className="text-[#16a34a] text-xs">{aiBhk} BHK</p>}</div>
                </div>
                {aiStep > 0 && <button onClick={() => { setAiStep(0); setAiBhk(null); setAiBudget(null); setAiFacing(null); }} className="text-[#9ca3af] hover:text-[#374151] text-xs">Change</button>}
              </div>
              {aiStep === 0 && (
                <div className="flex gap-2">
                  {bhkCategories.map((cat) => {
                    const num = cat.replace("BHK", "");
                    return (
                      <button key={cat} onClick={() => handleAiSelect(0, num)}
                        className="flex-1 py-3 rounded-xl text-center bg-[#f9fafb] border border-[#e5e7eb] hover:border-[#16a34a]/50 hover:bg-[#f0fdf4] transition-all">
                        <p className="text-xl font-bold text-[#111827]">{num}</p>
                        <p className="text-[#9ca3af] text-[10px] mt-0.5">BHK</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {aiStep >= 1 && (
              <div className={cn("bg-white rounded-2xl p-5 border transition-all animate-fade-in", aiStep === 1 ? "border-[#16a34a]/30 shadow-md" : "border-[#e5e7eb]", aiStep > 1 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-[#16a34a]" /></div>
                    <div><p className="text-sm font-medium text-[#111827]">Budget?</p>
                      {aiBudget && aiStep > 1 && <p className="text-[#16a34a] text-xs">{aiBudget}</p>}</div>
                  </div>
                  {aiStep > 1 && <button onClick={() => { setAiStep(1); setAiBudget(null); setAiFacing(null); }} className="text-[#9ca3af] hover:text-[#374151] text-xs">Change</button>}
                </div>
                {aiStep === 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    {d.aiBudgetRanges.map((b) => (
                      <button key={b} onClick={() => handleAiSelect(1, b)}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium bg-[#f9fafb] border border-[#e5e7eb] hover:border-[#16a34a]/50 hover:bg-[#f0fdf4] text-[#374151] transition-all">{b}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {aiStep >= 2 && (
              <div className={cn("bg-white rounded-2xl p-5 border transition-all animate-fade-in", aiStep === 2 ? "border-[#16a34a]/30 shadow-md" : "border-[#e5e7eb]", aiStep > 2 ? "opacity-60" : "")}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center"><Compass className="h-3.5 w-3.5 text-[#16a34a]" /></div>
                    <div><p className="text-sm font-medium text-[#111827]">Direction?</p>
                      {aiFacing && aiStep > 2 && <p className="text-[#16a34a] text-xs">{aiFacing} facing</p>}</div>
                  </div>
                  {aiStep > 2 && <button onClick={() => { setAiStep(2); setAiFacing(null); }} className="text-[#9ca3af] hover:text-[#374151] text-xs">Change</button>}
                </div>
                {aiStep === 2 && (
                  <div className="grid grid-cols-3 gap-2">
                    {d.aiFacings.map((f) => (
                      <button key={f} onClick={() => handleAiSelect(2, f)}
                        className="py-2.5 rounded-xl text-xs font-medium bg-[#f9fafb] border border-[#e5e7eb] hover:border-[#16a34a]/50 hover:bg-[#f0fdf4] text-[#374151] transition-all">{f}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {aiStep === 3 && aiResults !== null && (
            <div className="mt-6 max-w-lg mx-auto animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[#111827] text-base font-medium">{aiResults.length > 0 ? `${aiResults.length} match${aiResults.length > 1 ? "es" : ""} found` : "No match"}</h3>
                  <p className="text-[#9ca3af] text-xs">{aiBhk} BHK • {aiBudget} • {aiFacing}</p>
                </div>
                <button onClick={resetAi} className="flex items-center gap-1 text-[#16a34a] text-xs hover:underline"><RotateCcw className="h-3 w-3" /> Reset</button>
              </div>
              {aiResults.length > 0 ? (
                <div className="space-y-3">
                  {aiResults.map((p) => <BdgFloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} />)}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center border border-[#e5e7eb]">
                  <p className="text-[#9ca3af] mb-3 text-sm">Try different preferences</p>
                  <Button onClick={resetAi} variant="outline" className="rounded-full border-[#16a34a] text-[#16a34a]"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Try Again</Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── AMENITIES ─── */}
        <section id="bdg-amenities">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><TreePine className="h-4 w-4 text-[#16a34a]" /></div>
            <h2 className="text-xl font-bold text-[#111827]">Amenities</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-6">
            {d.amenities.icons.map((a) => {
              const Icon = iconMap[a.icon] || amenityIconMap[a.name] || Shield;
              return (
                <div key={a.name} className="flex flex-col items-center gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 hover:border-[#16a34a]/30 hover:bg-[#f0fdf4] transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#f0fdf4] flex items-center justify-center"><Icon className="h-4 w-4 text-[#16a34a]" /></div>
                  <span className="text-[#4b5563] text-[10px] text-center leading-tight">{a.name}</span>
                </div>
              );
            })}
          </div>
          {d.amenities.images.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {d.amenities.images.map((a, idx) => (
                <div key={a.src + idx} className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm border border-[#e5e7eb]">
                  <img src={a.src} alt={a.label || "Amenity"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {a.label && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3"><p className="text-white font-medium text-xs">{a.label}</p></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── MASTER PLAN ─── */}
        {d.masterPlanImage && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><MapPin className="h-4 w-4 text-[#16a34a]" /></div>
                <h2 className="text-xl font-bold text-[#111827]">Master Plan</h2>
              </div>
              <div className="rounded-2xl overflow-hidden border-2 border-[#16a34a]/20 cursor-pointer shadow-sm" onClick={() => setMasterPlanOpen(true)}>
                <img src={d.masterPlanImage} alt="Master Plan" loading="lazy" className="w-full hover:scale-[1.02] transition-transform duration-500" />
              </div>
              <p className="text-[#9ca3af] text-xs text-center mt-3">Tap to enlarge</p>
            </section>
            <Dialog open={masterPlanOpen} onOpenChange={setMasterPlanOpen}>
              <DialogContent className="max-w-5xl"><img src={d.masterPlanImage} alt="Master Plan" className="w-full rounded-lg"  loading="lazy" decoding="async" /></DialogContent>
            </Dialog>
          </>
        )}

        {/* ─── PROJECTS ─── */}
        {projects.length > 0 && (
          <section id="bdg-projects">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><Building2 className="h-4 w-4 text-[#16a34a]" /></div>
                <h2 className="text-xl font-bold text-[#111827]">Projects</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadBrochure} className="rounded-full text-xs gap-1 border-[#d1d5db] text-[#374151]">
                <Download className="h-3 w-3" /> Brochure
              </Button>
            </div>
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[#f9fafb] border border-[#e5e7eb] hover:shadow-md hover:border-[#16a34a]/20 transition-all cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#e5e7eb]">
                    {p.image || p.images?.[0] ? <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" /> : <Building2 className="h-6 w-6 text-[#d1d5db] m-auto mt-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[#111827] truncate">{p.name}</h4>
                    <p className="text-xs text-[#9ca3af] flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {p.status && <Badge className="text-[10px] bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]">{p.status}</Badge>}
                      {p.price_min && <span className="text-xs font-bold text-[#16a34a]">{formatPrice(p.price_min)}</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#d1d5db]" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── FLOOR PLANS ─── */}
        <section id="bdg-floorplans">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><Square className="h-4 w-4 text-[#16a34a]" /></div>
            <h2 className="text-xl font-bold text-[#111827]">Floor Plans</h2>
          </div>
          <p className="text-[#9ca3af] text-xs mb-4 ml-10">By facing direction</p>
          <div className="flex gap-2 mb-5 flex-wrap">
            {facingKeys.map((facing) => (
              <button key={facing} onClick={() => setFpTab(facing)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  fpTab === facing ? "bg-[#16a34a] text-white shadow-sm" : "bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb] hover:border-[#16a34a]/30")}>
                {facing}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {(d.floorPlansByFacing[fpTab] || []).map((p) => <BdgFloorPlanCard key={p.name} plan={p} onEnquire={() => scrollTo("contact")} />)}
          </div>
        </section>

        {/* ─── GALLERY ─── */}
        {d.gallery.length > 0 && (
          <>
            <section id="bdg-gallery">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><Eye className="h-4 w-4 text-[#16a34a]" /></div>
                <h2 className="text-xl font-bold text-[#111827]">Gallery</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {d.gallery.map((g) => (
                  <div key={g.label} className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-[#e5e7eb] shadow-sm" onClick={() => setGalleryOpen(g.src)}>
                    <img src={g.src} alt={g.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Dialog open={!!galleryOpen} onOpenChange={() => setGalleryOpen(null)}>
              <DialogContent className="max-w-4xl">{galleryOpen && <img src={galleryOpen} alt="Gallery" className="w-full rounded-lg"  loading="lazy" decoding="async" />}</DialogContent>
            </Dialog>
          </>
        )}

        {/* ─── LOCATION ─── */}
        <section id="bdg-location">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><MapPin className="h-4 w-4 text-[#16a34a]" /></div>
            <h2 className="text-xl font-bold text-[#111827]">Location</h2>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#e5e7eb] shadow-sm mb-3">
            <BuilderLocationMap lat={d.map.lat} lng={d.map.lng} builderName={d.name} height="350px" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#6b7280]"><MapPin className="h-4 w-4 text-[#16a34a]" /><span className="text-sm">{d.map.address}</span></div>
            <a href={d.map.mapsUrl || `https://www.google.com/maps?q=${d.map.lat},${d.map.lng}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-full bg-[#16a34a] text-white hover:bg-[#15803d] text-xs">Open in Maps</Button>
            </a>
          </div>
          {builder?.operating_cities?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {builder.operating_cities.map((city: string) => (
                <div key={city} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] text-xs text-[#065f46] font-medium"><MapPin className="h-3 w-3" /> {city}</div>
              ))}
            </div>
          )}
        </section>

        {/* ─── TRUST ─── */}
        <section className="bg-[#f0fdf4] rounded-3xl border border-[#dcfce7] p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {d.trust.filter(t => t.value !== "—").map((t) => (
              <div key={t.label} className="text-center">
                <p className="text-[#16a34a] text-lg font-bold">{t.value}</p>
                <p className="text-[#6b7280] text-[10px] mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>
          {builder?.rera_number && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-white border border-[#dcfce7] text-sm text-[#065f46]">
              <Shield className="h-4 w-4" /> RERA: <span className="font-mono font-medium">{builder.rera_number}</span>
            </div>
          )}
          {builder?.awards?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {builder.awards.map((a: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-white border border-[#fde68a] text-xs text-[#92400e]">
                  <Award className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />{a}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── OUR LEGACY ─── */}
        {d.hasTimeline && d.timeline.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center"><Clock className="h-4 w-4 text-[#16a34a]" /></div>
              <h2 className="text-xl font-bold text-[#111827]">Our Legacy</h2>
            </div>
            {/* Vertical left-aligned timeline */}
            <div className="relative ml-4">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#dcfce7]" />
              {d.timeline.map((t: any, i: number) => (
                <div key={t.year} className="relative pl-8 pb-8 last:pb-0">
                  <div className="absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full bg-[#16a34a] border-4 border-white shadow" />
                  <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                    <p className="text-[#16a34a] text-xs font-bold">{t.year}</p>
                    <p className="text-[#111827] font-medium text-sm mt-1">{t.title}</p>
                    <p className="text-[#9ca3af] text-xs mt-1">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CONTACT ─── */}
        <section id="bdg-contact" className="bg-[#111827] rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Get In Touch</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <form onSubmit={handleEnquiry} className="space-y-3">
              <Input placeholder="Your Name" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-11" />
              <Input placeholder="Phone Number" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-11" />
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11">
                  <SelectValue placeholder="Interested Unit" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f2937] border-[#374151]">
                  <SelectItem value="2bhk">2 BHK</SelectItem>
                  <SelectItem value="3bhk">3 BHK</SelectItem>
                  <SelectItem value="notsure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="lg" className="w-full rounded-xl bg-[#16a34a] text-white hover:bg-[#15803d]">
                Send Enquiry <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
            <div className="grid grid-cols-3 gap-3">
              <a href={`tel:${d.contact.phone}`} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all">
                <Phone className="h-5 w-5 text-[#16a34a]" /><span className="text-white/70 text-xs">Call</span>
              </a>
              <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all">
                <MessageCircle className="h-5 w-5 text-green-400" /><span className="text-white/70 text-xs">WhatsApp</span>
              </a>
              <a href={d.map.mapsUrl || `https://www.google.com/maps?q=${d.map.lat},${d.map.lng}`} target="_blank" rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all">
                <MapPin className="h-5 w-5 text-[#16a34a]" /><span className="text-white/70 text-xs">Visit Us</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-4 bg-[#f9fafb] border-t border-[#e5e7eb]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[#16a34a] text-lg font-bold">{d.name}</p>
          <p className="text-[#9ca3af] text-sm mt-1">{d.tagline}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <a href={`tel:${d.contact.phone}`} className="text-[#6b7280] text-xs hover:text-[#16a34a] flex items-center gap-1"><Phone className="h-3 w-3" />{d.contact.phone}</a>
            <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
              className="text-[#6b7280] text-xs hover:text-green-600 flex items-center gap-1"><MessageCircle className="h-3 w-3" />WhatsApp</a>
          </div>
          <p className="text-[#d1d5db] text-[10px] mt-4">&copy; {new Date().getFullYear()} {d.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── FLOATING CTA ─── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <a href={`https://wa.me/${d.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(d.contact.whatsappMessage)}`} target="_blank" rel="noopener noreferrer"
          className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <MessageCircle className="h-4 w-4 text-white" />
        </a>
        <a href={`tel:${d.contact.phone}`}
          className="w-11 h-11 rounded-full bg-[#16a34a] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <Phone className="h-4 w-4 text-white" />
        </a>
      </div>
      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-40 w-9 h-9 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center text-[#9ca3af] shadow-sm"><ChevronUp className="h-4 w-4" /></button>}
    </div>
  );
};

const BdgFloorPlanCard = ({ plan, onEnquire }: { plan: FloorPlan; onEnquire: () => void }) => (
  <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
    {plan.image && (
      <div className="aspect-square overflow-hidden bg-[#f9fafb]">
        <img src={plan.image} alt={plan.name} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
      </div>
    )}
    <div className="p-4 border-t border-[#f3f4f6]">
      <p className="text-[#111827] font-semibold text-sm mb-1">{plan.name}</p>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#16a34a] font-semibold text-sm">{plan.facing} Facing</p>
        {plan.priceRange && <span className="text-[#16a34a] text-xs font-bold">{plan.priceRange}</span>}
      </div>
      <div className="flex gap-4 text-xs text-[#9ca3af]">
        <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{plan.beds} Bed</span>
        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{plan.baths} Bath</span>
        <span className="flex items-center gap-1"><Square className="h-3 w-3" />{plan.carpetArea || plan.size}</span>
      </div>
      {plan.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {plan.highlights.map((h) => (
            <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#065f46] border border-[#dcfce7]">{h}</span>
          ))}
        </div>
      )}
      <Button size="sm" className="w-full mt-3 rounded-lg text-xs bg-[#16a34a] text-white hover:bg-[#15803d]" onClick={onEnquire}>
        Enquire About This Plan
      </Button>
    </div>
  </div>
);

export default BudgetMicrosite;
