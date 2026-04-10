import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Mail, Globe, Shield, Star, MapPin, Award, Sparkles, Building2, ChevronUp, Play, Eye, Target, Briefcase, Users, User, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  builder: any;
}

const amenityIcons: Record<string, string> = {
  "Swimming Pool": "🏊", "Gym": "🏋️", "Parking": "🅿️", "Garden": "🌳",
  "Security": "🛡️", "Wi-Fi": "📶", "AC": "❄️", "Water Supply": "💧",
  "Power Backup": "⚡", "Kids Play Area": "🧒", "Pet Friendly": "🐾",
  "Landscaping": "🌸", "Game Room": "🎮", "Library": "📚", "Cafeteria": "☕",
};

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "gallery", label: "Gallery" },
  { id: "projects", label: "Projects" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Team" },
  { id: "contact", label: "Contact" },
];

const StandardMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  const [contactOpen, setContactOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
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
    setHeaderSolid(window.scrollY > 80);
    for (const section of [...SECTIONS].reverse()) {
      const el = sectionRefs.current[section.id];
      if (el && el.getBoundingClientRect().top <= 120) { setActiveSection(section.id); break; }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
  };

  const allImages = builder.images?.filter(Boolean) || [];
  const people = Array.isArray(builder.key_people) ? builder.key_people : [];
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#1a2a1a]">
      {/* ═══ STANDARD: Subtle green gradient bg ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-teal-50/40 to-transparent rounded-full blur-[80px]" />
      </div>

      {/* ═══ STANDARD: Clean header with emerald accent ═══ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8 transition-all duration-500",
        headerSolid ? "bg-white/85 backdrop-blur-2xl border-b border-emerald-100/40 shadow-sm" : "bg-transparent"
      )}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-emerald-700/70 hover:text-emerald-800 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {builder.logo && <img src={builder.logo} alt="" className={cn("rounded-lg object-contain bg-white shadow-sm border border-emerald-100/50 transition-all", headerSolid ? "h-7 w-7 p-0.5" : "h-0 opacity-0")} />}
          <span className={cn("text-xs font-semibold tracking-[0.15em] uppercase text-emerald-800/70 transition-all", headerSolid ? "opacity-100" : "opacity-0")}>{builder.builder_name}</span>
        </div>
        <Button size="sm" onClick={() => setContactOpen(true)} className="text-xs rounded-xl px-5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_2px_15px_rgba(16,185,129,0.2)] font-medium">
          Contact
        </Button>
      </header>

      {/* ═══ STANDARD: Card-style hero ═══ */}
      <div className="pt-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden bg-white border border-emerald-100/50 shadow-[0_4px_30px_rgba(16,185,129,0.06)]">
            {/* Hero image */}
            <div className="relative h-[300px] md:h-[380px]">
              {builder.images?.[0] ? (
                <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
            </div>

            {/* Hero content overlapping image */}
            <div className="relative -mt-24 px-6 md:px-8 pb-6">
              <div className="flex flex-col md:flex-row items-start gap-5">
                {builder.logo && (
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-emerald-100/50 p-2.5 flex-shrink-0">
                    <img src={builder.logo} alt="" className="w-full h-full object-contain rounded-lg" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                      <Sparkles className="h-3 w-3 mr-1" /> Standard
                    </Badge>
                    {builder.established_year && <Badge variant="outline" className="border-emerald-200/50 text-emerald-600/70 text-[10px] rounded-full">Est. {builder.established_year}</Badge>}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-[#1a2a1a] tracking-tight">{builder.builder_name}</h1>
                  {builder.tagline && <p className="text-emerald-700/60 mt-1.5 text-sm">"{builder.tagline}"</p>}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {builder.customer_rating > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-600 font-medium"><Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {builder.customer_rating}/5</span>
                    )}
                    {builder.operating_cities?.length > 0 && (
                      <span className="flex items-center gap-1 text-emerald-700/50 text-xs"><MapPin className="h-3 w-3" /> {builder.operating_cities.join(", ")}</span>
                    )}
                    {builder.years_of_experience && <span className="text-emerald-700/50 text-xs">{builder.years_of_experience}+ Years</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 mt-2 md:mt-8">
                  <Button onClick={() => scrollToSection("projects")} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-sm px-5">
                    <Building2 className="h-4 w-4" /> Projects
                  </Button>
                  <Button variant="outline" onClick={() => setContactOpen(true)} className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 px-5">
                    <Phone className="h-4 w-4" /> Contact
                  </Button>
                </div>
              </div>

              {/* Stats row inside hero card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-100/50">
                {[
                  { label: "Completed", value: builder.completed_projects_count || 0, icon: Building2 },
                  { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN"), icon: Users },
                  { label: "Experience", value: `${builder.years_of_experience || 0}+ yrs`, icon: Award },
                  { label: "Cities", value: builder.operating_cities?.length || 0, icon: MapPin },
                ].filter(s => s.value && s.value !== "0" && s.value !== 0).map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/30">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><stat.icon className="h-4 w-4 text-emerald-600" /></div>
                    <div>
                      <p className="text-base font-bold text-[#1a2a1a] leading-none">{stat.value}</p>
                      <p className="text-[10px] text-emerald-700/50 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STANDARD: Tab navigation ═══ */}
      <nav className="sticky top-14 z-40 bg-white/80 backdrop-blur-xl border-b border-emerald-100/30 mt-6">
        <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center h-11 gap-1 px-4 md:px-8 min-w-max">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => scrollToSection(s.id)} className={cn(
                "px-4 py-2 text-xs font-medium rounded-full transition-all whitespace-nowrap",
                activeSection === s.id ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700/50 hover:text-emerald-700 hover:bg-emerald-50"
              )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ STANDARD: Centered card-based sections ═══ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-10 relative z-10">
        {/* About */}
        <section ref={(el) => (sectionRefs.current["about"] = el)} className="space-y-4">
          <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-600" /> About</h2>
          {builder.description && <div className="p-5 rounded-2xl bg-white border border-emerald-100/40 shadow-sm"><p className="text-sm text-[#4a5a4a] leading-relaxed">{builder.description}</p></div>}
          {(builder.about_mission || builder.about_vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builder.about_mission && <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100/40"><h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-emerald-800"><Target className="h-4 w-4 text-emerald-600" /> Mission</h3><p className="text-sm text-emerald-700/70">{builder.about_mission}</p></div>}
              {builder.about_vision && <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100/40"><h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-teal-800"><Eye className="h-4 w-4 text-teal-600" /> Vision</h3><p className="text-sm text-teal-700/70">{builder.about_vision}</p></div>}
            </div>
          )}
          {builder.specializations?.length > 0 && <div className="flex flex-wrap gap-2">{builder.specializations.map((s: string) => <Badge key={s} className="text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-3 py-1">{s}</Badge>)}</div>}
          {builder.awards?.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{builder.awards.map((a: string, i: number) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100/40"><Award className="h-4 w-4 text-amber-500 flex-shrink-0" /><span className="text-sm text-[#4a5a4a]">{a}</span></div>)}</div>}
          {(builder.rera_number || builder.certifications) && (
            <div className="p-5 rounded-2xl bg-white border border-emerald-100/40 shadow-sm space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-800"><Shield className="h-4 w-4 text-emerald-600" /> Compliance</h3>
              {builder.rera_number && <div className="flex justify-between p-3 rounded-xl bg-emerald-50/50 text-sm"><span className="text-emerald-700/50">RERA</span><span className="font-mono text-emerald-700 font-medium">{builder.rera_number}</span></div>}
              {builder.certifications && <div className="flex justify-between p-3 rounded-xl bg-emerald-50/30 text-sm"><span className="text-emerald-700/50">Certifications</span><span className="text-emerald-800">{builder.certifications}</span></div>}
            </div>
          )}
        </section>

        {/* Gallery */}
        {allImages.length > 0 && (
          <section ref={(el) => (sectionRefs.current["gallery"] = el)}>
            <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2 mb-4"><Play className="h-4 w-4 text-emerald-600" /> Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {allImages.map((img: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-emerald-100/30 shadow-sm" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section ref={(el) => (sectionRefs.current["projects"] = el)}>
            <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2 mb-4"><Building2 className="h-4 w-4 text-emerald-600" /> Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-emerald-100/40 hover:border-emerald-300/50 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-emerald-50 border border-emerald-100/30">
                    {p.image || p.images?.[0] ? <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-5 w-5 text-emerald-300 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-[#1a2a1a] truncate group-hover:text-emerald-700 transition-colors">{p.name}</h4>
                    <p className="text-xs text-emerald-700/40 mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.status && <Badge className="text-[10px] h-5 bg-emerald-50 text-emerald-600 border-0">{p.status}</Badge>}
                      {p.price_min && <span className="text-xs font-semibold text-emerald-600">{formatPrice(p.price_min)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Amenities */}
        {(builder.amenities?.length > 0 || builder.unit_types?.length > 0) && (
          <section ref={(el) => (sectionRefs.current["amenities"] = el)}>
            <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2 mb-4"><Sparkles className="h-4 w-4 text-emerald-600" /> Amenities</h2>
            {builder.unit_types?.length > 0 && <div className="flex flex-wrap gap-2 mb-4">{builder.unit_types.map((u: string) => <Badge key={u} variant="outline" className="rounded-full px-3 py-1.5 text-xs border-emerald-200 text-emerald-700">{u}</Badge>)}</div>}
            {builder.amenities?.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {builder.amenities.map((a: string) => (
                  <div key={a} className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-white border border-emerald-100/40 hover:border-emerald-300/40 hover:shadow-sm transition-all text-center">
                    <span className="text-xl">{amenityIcons[a] || "✦"}</span>
                    <span className="text-[10px] text-emerald-700/60 leading-tight">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Team */}
        {people.length > 0 && (
          <section ref={(el) => (sectionRefs.current["team"] = el)}>
            <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2 mb-4"><Users className="h-4 w-4 text-emerald-600" /> Team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {people.map((person: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-emerald-100/40">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <div><p className="font-medium text-sm">{person.name}</p><p className="text-xs text-emerald-700/40">{person.role}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section ref={(el) => (sectionRefs.current["contact"] = el)}>
          <h2 className="text-lg font-bold text-[#1a2a1a] flex items-center gap-2 mb-4"><Phone className="h-4 w-4 text-emerald-600" /> Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-emerald-100/40 shadow-sm space-y-3">
              <Button className="w-full h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={() => window.open(`tel:${builder.phone}`)}><Phone className="h-4 w-4" /> Call Now</Button>
              {builder.whatsapp && <Button variant="outline" className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>}
              {builder.email && <Button variant="outline" className="w-full h-11 rounded-xl border-emerald-200/50 text-emerald-700/70 hover:bg-emerald-50 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}><Mail className="h-4 w-4" /> Email</Button>}
            </div>
            <div className="p-5 rounded-2xl bg-white border border-emerald-100/40 shadow-sm space-y-2.5">
              {builder.rera_number && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700"><Shield className="h-3.5 w-3.5" /> RERA: {builder.rera_number}</div>}
              {builder.website && <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-emerald-100/50 text-xs text-emerald-700/60 hover:text-emerald-700 transition-colors"><Globe className="h-3.5 w-3.5" /> {builder.website.replace(/https?:\/\//, "")}</a>}
              {offices.map((o: any, i: number) => <div key={i} className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-100/30 text-xs"><p className="font-medium text-[#2a3a2a]">{o.city}</p><p className="text-emerald-700/40 mt-0.5">{o.address}</p></div>)}
            </div>
          </div>
        </section>
      </div>

      {/* FAB */}
      {!contactOpen && (
        <button onClick={() => setContactOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-700 active:scale-95 transition-all">
          <Phone className="h-5 w-5 text-white" />
        </button>
      )}

      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-emerald-200/40 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 shadow-sm"><ChevronUp className="h-4 w-4" /></button>}

      {/* Contact slide */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={() => setContactOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 animate-slide-in-right shadow-xl flex flex-col bg-white border-l border-emerald-100/40">
            <div className="flex items-center justify-between p-5 border-b border-emerald-100/40">
              <h3 className="font-semibold text-sm text-[#1a2a1a]">Contact {builder.builder_name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8 rounded-xl"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button className="w-full h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={() => window.open(`tel:${builder.phone}`)}><Phone className="h-4 w-4" /> Call Now</Button>
              {builder.whatsapp && <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>}
              <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200/50 text-emerald-700/70 hover:bg-emerald-50 gap-2"><Calendar className="h-4 w-4" /> Schedule Visit</Button>
              {builder.email && <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200/50 text-emerald-700/70 hover:bg-emerald-50 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}><Mail className="h-4 w-4" /> Email</Button>}
            </div>
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white border border-emerald-100/30 rounded-2xl overflow-hidden">
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

export default StandardMicrosite;
