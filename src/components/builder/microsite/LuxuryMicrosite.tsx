import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Mail, Globe, Shield, Star, MapPin, Award, Sparkles, Building2, ChevronUp, Play, Crown, Diamond, Eye, Target, Briefcase, Users, User, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  builder: any;
}

const amenityIcons: Record<string, any> = {
  "Swimming Pool": () => <span>🏊</span>, "Gym": () => <span>🏋️</span>, "Parking": () => <span>🅿️</span>,
  "Garden": () => <span>🌳</span>, "Security": () => <span>🛡️</span>, "Wi-Fi": () => <span>📶</span>,
  "AC": () => <span>❄️</span>, "Water Supply": () => <span>💧</span>, "Power Backup": () => <span>⚡</span>,
  "Kids Play Area": () => <span>🧒</span>, "Pet Friendly": () => <span>🐾</span>, "Landscaping": () => <span>🌸</span>,
  "Game Room": () => <span>🎮</span>, "Library": () => <span>📚</span>, "Cafeteria": () => <span>☕</span>,
};

const formatPrice = (val: number | null) => {
  if (!val) return "N/A";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const formatArea = (sqft: number | null) => {
  if (!sqft) return null;
  if (sqft >= 10000000) return `${(sqft / 10000000).toFixed(0)}M`;
  if (sqft >= 100000) return `${(sqft / 100000).toFixed(0)}L`;
  return sqft.toLocaleString("en-IN");
};

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "gallery", label: "Gallery" },
  { id: "projects", label: "Projects" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Leadership" },
  { id: "contact", label: "Contact" },
];

const LuxuryMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  const [contactOpen, setContactOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder.builder_name}%`).limit(20);
      if (data) setProjects(data);
    };
    if (builder.builder_name) fetch();
  }, [builder.builder_name]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 600);
    setHeaderCompact(window.scrollY > 100);
    for (const section of [...SECTIONS].reverse()) {
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
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
  };

  const allImages = builder.images?.filter(Boolean) || [];
  const people = Array.isArray(builder.key_people) ? builder.key_people : [];
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a]">
      {/* ═══ LUXURY: Ambient gold shimmer background ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-amber-100/40 via-transparent to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/30 via-transparent to-transparent rounded-full blur-[100px]" />
      </div>

      {/* ═══ LUXURY: Minimal gold-accented header ═══ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        headerCompact
          ? "h-14 bg-[#faf9f6]/80 backdrop-blur-2xl border-b border-amber-200/30 shadow-[0_1px_20px_rgba(180,160,100,0.08)]"
          : "h-16 bg-transparent"
      )}>
        <div className="h-full max-w-[1400px] mx-auto flex items-center px-5 md:px-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[#8a7a5a] hover:text-[#5a4a30] transition-colors font-medium">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex-1 flex items-center justify-center gap-3">
            {builder.logo && (
              <img src={builder.logo} alt="" className={cn("rounded-xl object-contain bg-white/80 shadow-sm border border-amber-100/50 transition-all", headerCompact ? "h-8 w-8 p-1" : "h-0 w-0 opacity-0")} />
            )}
            <span className={cn("text-xs font-semibold tracking-[0.2em] uppercase text-[#8a7a5a] transition-all", headerCompact ? "opacity-100" : "opacity-0")}>{builder.builder_name}</span>
          </div>
          <Button size="sm" onClick={() => setContactOpen(true)} className="text-xs rounded-full px-6 bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-white hover:from-[#a0841e] hover:to-[#c4a027] shadow-[0_2px_20px_rgba(180,150,40,0.25)] font-semibold tracking-wide">
            <Crown className="h-3.5 w-3.5 mr-1.5" /> Enquire
          </Button>
        </div>
      </header>

      {/* ═══ LUXURY: Cinematic hero with asymmetric layout ═══ */}
      <div className="relative min-h-[85vh] flex items-end overflow-hidden">
        {builder.images?.[0] ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a0e] via-[#2a2a1a] to-[#0a0a05]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a05] via-[#0a0a05]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a05]/80 via-transparent to-[#0a0a05]/40" />

        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 md:px-10 pb-16 pt-32">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 items-end">
            {/* Left: Builder identity */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/25 text-[10px] font-bold uppercase tracking-[0.25em] px-4 py-2 rounded-full">
                  <Diamond className="h-3 w-3 mr-1.5" /> Luxury Builder
                </Badge>
                {builder.established_year && (
                  <Badge variant="outline" className="border-white/15 text-white/60 text-[10px] rounded-full bg-white/5">Est. {builder.established_year}</Badge>
                )}
              </div>

              {builder.logo && (
                <div className="relative inline-block">
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-[#d4af37]/30 to-amber-600/20 rounded-2xl blur-md" />
                  <img src={builder.logo} alt="" className="relative h-16 w-16 rounded-2xl border border-[#d4af37]/30 object-contain bg-black/40 p-2.5 backdrop-blur-sm" />
                </div>
              )}

              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.05]" style={{ fontFamily: "var(--font-primary)" }}>
                {builder.builder_name}
              </h1>
              {builder.tagline && (
                <p className="text-lg text-white/50 max-w-lg font-light italic leading-relaxed">"{builder.tagline}"</p>
              )}

              <div className="flex items-center gap-5 text-sm">
                {builder.customer_rating > 0 && (
                  <span className="flex items-center gap-2 bg-[#d4af37]/10 backdrop-blur-sm px-4 py-2 rounded-full border border-[#d4af37]/20">
                    <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
                    <span className="text-[#d4af37] font-semibold">{builder.customer_rating}</span>
                    <span className="text-white/30">/5</span>
                  </span>
                )}
                {builder.operating_cities?.length > 0 && (
                  <span className="flex items-center gap-1.5 text-white/40">
                    <MapPin className="h-3.5 w-3.5" /> {builder.operating_cities.join(" · ")}
                  </span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button size="lg" onClick={() => scrollToSection("projects")} className="rounded-full px-8 bg-white text-[#1a1a0e] hover:bg-white/90 font-semibold gap-2 shadow-[0_4px_30px_rgba(255,255,255,0.15)]">
                  <Building2 className="h-4 w-4" /> View Projects
                </Button>
                <Button size="lg" variant="outline" onClick={() => setContactOpen(true)} className="rounded-full px-8 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50 font-semibold gap-2 bg-transparent">
                  <Phone className="h-4 w-4" /> Contact Now
                </Button>
              </div>
            </div>

            {/* Right: Floating stats card (luxury exclusive) */}
            <div className="hidden lg:block">
              <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.1] p-6 space-y-4 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d4af37]/70 mb-4">Builder Highlights</h3>
                {[
                  { label: "Completed Projects", value: builder.completed_projects_count || 0, icon: Building2 },
                  { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN"), icon: Users },
                  { label: "Experience", value: `${builder.years_of_experience || 0}+ Years`, icon: Award },
                  { label: "Rating", value: `${builder.customer_rating || 0}/5`, icon: Star },
                ].filter(s => s.value && s.value !== "0" && s.value !== 0).map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-amber-600/10 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LUXURY: Sticky section nav with gold accent ═══ */}
      <nav className={cn(
        "sticky top-14 z-40 transition-all duration-300",
        "bg-[#faf9f6]/90 backdrop-blur-xl border-b border-amber-200/20"
      )}>
        <div className="max-w-[1400px] mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center h-12 gap-0 px-5 md:px-8 min-w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "h-full px-5 text-xs font-semibold tracking-wide border-b-2 transition-all whitespace-nowrap",
                  activeSection === s.id
                    ? "text-[#8a6a20] border-[#d4af37]"
                    : "border-transparent text-[#8a7a5a]/60 hover:text-[#8a7a5a]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ LUXURY: Split layout — content left, fixed panel right ═══ */}
      <div className="max-w-[1400px] mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-0">
          {/* Left: Scrollable sections */}
          <div className="px-5 md:px-8 py-12 space-y-16">
            {/* About */}
            <section ref={(el) => (sectionRefs.current["about"] = el)}>
              <SectionHeader title="About" icon={<Briefcase className="h-4 w-4" />} />
              <div className="space-y-4 mt-6">
                {builder.description && (
                  <div className="p-6 rounded-2xl bg-white border border-amber-100/50 shadow-[0_2px_20px_rgba(180,160,100,0.06)]">
                    <p className="text-[#4a4a3a] leading-relaxed text-sm">{builder.description}</p>
                  </div>
                )}
                {(builder.about_mission || builder.about_vision) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {builder.about_mission && (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-100/40">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-[#5a4a20]"><Target className="h-4 w-4 text-[#d4af37]" /> Our Mission</h3>
                        <p className="text-sm text-[#6a6a5a]">{builder.about_mission}</p>
                      </div>
                    )}
                    {builder.about_vision && (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100/40">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-[#2a5a24]"><Eye className="h-4 w-4 text-emerald-600" /> Our Vision</h3>
                        <p className="text-sm text-[#6a6a5a]">{builder.about_vision}</p>
                      </div>
                    )}
                  </div>
                )}
                {builder.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {builder.specializations.map((s: string) => (
                      <Badge key={s} className="text-xs rounded-full bg-[#d4af37]/8 text-[#8a6a20] border border-[#d4af37]/20 hover:bg-[#d4af37]/15 px-3.5 py-1.5">{s}</Badge>
                    ))}
                  </div>
                )}
                {builder.awards?.length > 0 && (
                  <div className="space-y-2">
                    {builder.awards.map((a: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/60 to-white border border-amber-100/40">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-amber-600 flex items-center justify-center flex-shrink-0 shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm text-[#4a4a3a] font-medium">{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Gallery */}
            {allImages.length > 0 && (
              <section ref={(el) => (sectionRefs.current["gallery"] = el)}>
                <SectionHeader title="Gallery & Media" icon={<Play className="h-4 w-4" />} />
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allImages.map((img: string, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "relative overflow-hidden cursor-pointer group rounded-2xl border border-amber-100/30 shadow-sm",
                        i === 0 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-square"
                      )}
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ))}
                </div>
                {builder.videos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {builder.videos.map((v: string, i: number) => (
                      <Button key={i} variant="outline" size="sm" className="rounded-full text-xs border-amber-200/50 text-[#8a6a20] hover:bg-amber-50" onClick={() => window.open(v, "_blank")}>
                        <Play className="h-3 w-3 mr-1" /> Video {i + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <section ref={(el) => (sectionRefs.current["projects"] = el)}>
                <SectionHeader title="Projects" icon={<Building2 className="h-4 w-4" />} />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-amber-100/40 hover:border-[#d4af37]/30 hover:shadow-[0_4px_20px_rgba(212,175,55,0.08)] transition-all cursor-pointer group" onClick={() => navigate(`/projects/${p.id}`)}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50 border border-amber-100/30">
                        {p.image || p.images?.[0] ? <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-6 w-6 text-amber-300 m-auto mt-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#2a2a1a] truncate group-hover:text-[#8a6a20] transition-colors">{p.name}</h4>
                        <p className="text-xs text-[#8a8a7a] mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {p.status && <Badge className="text-[10px] h-5 bg-amber-50 text-[#8a6a20] border border-amber-200/30">{p.status}</Badge>}
                          {p.price_min && <span className="text-xs font-semibold text-[#8a6a20]">{formatPrice(p.price_min)}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-300 group-hover:text-[#d4af37] transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Amenities */}
            {(builder.amenities?.length > 0 || builder.unit_types?.length > 0) && (
              <section ref={(el) => (sectionRefs.current["amenities"] = el)}>
                <SectionHeader title="Amenities & Configurations" icon={<Sparkles className="h-4 w-4" />} />
                <div className="mt-6 space-y-4">
                  {builder.unit_types?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {builder.unit_types.map((u: string) => (
                        <Badge key={u} variant="outline" className="text-xs px-4 py-2 rounded-full border-amber-200/50 text-[#8a6a20] bg-amber-50/50">{u}</Badge>
                      ))}
                    </div>
                  )}
                  {builder.amenities?.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {builder.amenities.map((a: string) => {
                        const Icon = amenityIcons[a];
                        return (
                          <div key={a} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-amber-100/40 hover:border-[#d4af37]/25 hover:shadow-[0_4px_16px_rgba(212,175,55,0.06)] transition-all group text-center">
                            <span className="text-2xl group-hover:scale-110 transition-transform">{Icon ? <Icon /> : "✦"}</span>
                            <span className="text-[11px] text-[#6a6a5a] leading-tight font-medium">{a}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Team */}
            {people.length > 0 && (
              <section ref={(el) => (sectionRefs.current["team"] = el)}>
                <SectionHeader title="Leadership" icon={<Users className="h-4 w-4" />} />
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {people.map((person: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-amber-100/40 hover:border-[#d4af37]/25 transition-all">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d4af37]/20 to-amber-100/50 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[#d4af37]/20">
                        {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-[#d4af37]" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#2a2a1a]">{person.name}</p>
                        <p className="text-xs text-[#8a8a7a]">{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Contact */}
            <section ref={(el) => (sectionRefs.current["contact"] = el)}>
              <SectionHeader title="Get in Touch" icon={<Phone className="h-4 w-4" />} />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white border border-amber-100/50 space-y-3 shadow-sm">
                  <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-white hover:from-[#a0841e] hover:to-[#c4a027] gap-2 font-semibold shadow-[0_2px_20px_rgba(212,175,55,0.2)]" onClick={() => window.open(`tel:${builder.phone}`)}>
                    <Phone className="h-4 w-4" /> Call Now
                  </Button>
                  {builder.whatsapp && (
                    <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  )}
                  {builder.email && (
                    <Button variant="outline" className="w-full h-12 rounded-xl border-amber-200/50 text-[#8a6a20] hover:bg-amber-50/50 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}>
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                  )}
                </div>
                <div className="p-6 rounded-2xl bg-white border border-amber-100/50 space-y-3 shadow-sm">
                  {builder.rera_number && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <div><p className="font-semibold">RERA Verified</p><p className="text-[10px] opacity-70 font-mono mt-0.5">{builder.rera_number}</p></div>
                    </div>
                  )}
                  {builder.certifications && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-[#8a6a20]">
                      <Award className="h-4 w-4 flex-shrink-0" /> {builder.certifications}
                    </div>
                  )}
                  {offices.length > 0 && offices.map((office: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-[#faf9f6] border border-amber-100/30 text-xs">
                      <p className="font-semibold text-[#4a4a3a]">{office.city}</p>
                      <p className="text-[#8a8a7a] mt-0.5">{office.address}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right: Fixed floating action panel (LUXURY EXCLUSIVE) */}
          <div className="hidden lg:block relative">
            <div className="sticky top-[110px] m-5 mr-8">
              <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-amber-100/60 shadow-[0_8px_40px_rgba(180,160,100,0.1)] p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-[#d4af37]" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a20]">Quick Actions</h3>
                </div>

                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-white hover:from-[#a0841e] hover:to-[#c4a027] gap-2 font-semibold shadow-[0_2px_20px_rgba(212,175,55,0.25)]" onClick={() => window.open(`tel:${builder.phone}`)}>
                  <Phone className="h-4 w-4" /> Call Builder
                </Button>
                {builder.whatsapp && (
                  <Button variant="outline" className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 gap-2 text-sm" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                )}
                <Button variant="outline" className="w-full h-11 rounded-xl border-amber-200/60 text-[#8a6a20] hover:bg-amber-50/50 gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> Schedule Visit
                </Button>

                <div className="pt-3 border-t border-amber-100/40 space-y-2.5">
                  {builder.rera_number && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 rounded-xl p-2.5 border border-emerald-100/50">
                      <Shield className="h-3.5 w-3.5 flex-shrink-0" /> RERA: {builder.rera_number}
                    </div>
                  )}
                  {builder.customer_rating > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-[#8a6a20] bg-amber-50 rounded-xl p-2.5 border border-amber-100/50">
                      <Star className="h-3.5 w-3.5 fill-[#d4af37] text-[#d4af37]" /> {builder.customer_rating}/5 Rating
                    </div>
                  )}
                  {builder.website && (
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-[#8a7a5a] hover:text-[#5a4a30] p-2.5 rounded-xl border border-amber-100/30 hover:border-amber-200/50 transition-colors">
                      <Globe className="h-3.5 w-3.5" /> {builder.website.replace(/https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating contact (mobile only) */}
      {!contactOpen && (
        <button onClick={() => setContactOpen(true)} className="fixed bottom-6 right-6 z-50 lg:hidden group">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#d4af37] to-amber-500 rounded-2xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b8982e] to-[#d4af37] flex items-center justify-center shadow-xl">
              <Phone className="h-5 w-5 text-white" />
            </div>
          </div>
        </button>
      )}

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-amber-200/50 flex items-center justify-center text-[#8a6a20] hover:bg-amber-50 shadow-sm transition-all">
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Contact slide-in */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setContactOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 animate-slide-in-right shadow-2xl flex flex-col bg-[#faf9f6] border-l border-amber-200/30">
            <div className="flex items-center justify-between p-5 border-b border-amber-100/50">
              <h3 className="font-semibold text-sm text-[#2a2a1a] flex items-center gap-2"><Crown className="h-4 w-4 text-[#d4af37]" /> Contact {builder.builder_name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8 rounded-xl text-[#8a8a7a] hover:text-[#4a4a3a] hover:bg-amber-50"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button className="w-full h-12 text-sm gap-2 rounded-xl font-semibold bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-white hover:from-[#a0841e] hover:to-[#c4a027]" onClick={() => window.open(`tel:${builder.phone}`)}><Phone className="h-4 w-4" /> Call Now</Button>
              {builder.whatsapp && <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>}
              <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl border-amber-200/60 text-[#8a6a20] hover:bg-amber-50"><Calendar className="h-4 w-4" /> Schedule a Visit</Button>
              {builder.email && <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl border-amber-200/60 text-[#8a6a20] hover:bg-amber-50" onClick={() => window.open(`mailto:${builder.email}`)}><Mail className="h-4 w-4" /> Email</Button>}
            </div>
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-[#faf9f6] border border-amber-200/30 rounded-2xl overflow-hidden">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain" />
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 rounded-xl bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxOpen(false)}><X className="h-5 w-5" /></Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxIndex((p) => (p - 1 + allImages.length) % allImages.length)}><ChevronLeft className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/40 hover:bg-black/60 text-white" onClick={() => setLightboxIndex((p) => (p + 1) % allImages.length)}><ChevronRight className="h-5 w-5" /></Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37]/15 to-amber-100/30 flex items-center justify-center text-[#d4af37]">{icon}</div>
    <h2 className="text-lg font-bold text-[#2a2a1a] tracking-tight">{title}</h2>
    <div className="h-px flex-1 bg-gradient-to-r from-amber-200/40 to-transparent" />
  </div>
);

export default LuxuryMicrosite;
