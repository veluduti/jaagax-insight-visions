import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Mail, Globe, Shield, Star, MapPin, Award, Building2, ChevronUp, Play, Eye, Target, Briefcase, Users, User, ChevronRight, ChevronLeft, Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  builder: any;
}

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

const BudgetMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  const [contactOpen, setContactOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder.builder_name}%`).limit(20);
      if (data) setProjects(data);
    };
    if (builder.builder_name) fetch();
  }, [builder.builder_name]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 400);
    setHeaderSolid(window.scrollY > 60);
    for (const section of [...SECTIONS].reverse()) {
      const el = sectionRefs.current[section.id];
      if (el && el.getBoundingClientRect().top <= 110) { setActiveSection(section.id); break; }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
  };

  const allImages = builder.images?.filter(Boolean) || [];
  const people = Array.isArray(builder.key_people) ? builder.key_people : [];
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1e293b]">
      {/* ═══ BUDGET: Clean blue background ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-blue-50/50 to-transparent rounded-full blur-[80px]" />
      </div>

      {/* ═══ BUDGET: Compact header with inline contact ═══ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-3 md:px-6 transition-all duration-300",
        headerSolid ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" : "bg-white/60 backdrop-blur-md"
      )}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{builder.builder_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-3 w-3 mr-1" /> Call
          </Button>
          <Button size="sm" className="h-7 text-[10px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-2.5">
            Enquire
          </Button>
        </div>
      </header>

      {/* ═══ BUDGET: Compact horizontal hero ═══ */}
      <div className="pt-14 px-3 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white border border-slate-200/50 shadow-sm">
            {/* Image thumbnail */}
            <div className="w-full md:w-48 h-40 md:h-auto rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
              {builder.images?.[0] ? (
                <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Home className="h-8 w-8 text-slate-300" /></div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {builder.logo && <img src={builder.logo} alt="" className="h-8 w-8 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1" />}
                <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-medium rounded-md px-2 py-0.5">Value Builder</Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{builder.builder_name}</h1>
              {builder.tagline && <p className="text-xs text-slate-400 mt-1 line-clamp-1">"{builder.tagline}"</p>}
              
              <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500 flex-wrap">
                {builder.customer_rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {builder.customer_rating}/5</span>}
                {builder.operating_cities?.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {builder.operating_cities.join(", ")}</span>}
                {builder.years_of_experience && <span>{builder.years_of_experience}+ yrs</span>}
              </div>

              {/* Inline compact stats */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                {builder.completed_projects_count > 0 && <div className="text-center"><p className="text-base font-bold text-blue-600">{builder.completed_projects_count}</p><p className="text-[9px] text-slate-400">Projects</p></div>}
                {builder.total_units_delivered > 0 && <div className="text-center"><p className="text-base font-bold text-blue-600">{builder.total_units_delivered.toLocaleString()}</p><p className="text-[9px] text-slate-400">Units</p></div>}
                {builder.operating_cities?.length > 0 && <div className="text-center"><p className="text-base font-bold text-blue-600">{builder.operating_cities.length}</p><p className="text-[9px] text-slate-400">Cities</p></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BUDGET: Horizontal scrolling tab pills ═══ */}
      <nav className="sticky top-12 z-40 bg-[#f0f4f8]/90 backdrop-blur-lg py-2 px-3 md:px-6 mt-3">
        <div className="max-w-4xl mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => scrollToSection(s.id)} className={cn(
                "px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap",
                activeSection === s.id ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200/50"
              )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ BUDGET: Single-column compact sections ═══ */}
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 space-y-6 relative z-10">
        {/* About */}
        <section ref={(el) => (sectionRefs.current["about"] = el)} className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-blue-500" /> About</h2>
          {builder.description && <div className="p-4 rounded-xl bg-white border border-slate-200/50 shadow-sm"><p className="text-xs text-slate-500 leading-relaxed">{builder.description}</p></div>}
          {(builder.about_mission || builder.about_vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {builder.about_mission && <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/40"><h3 className="font-semibold flex items-center gap-1.5 mb-1.5 text-xs text-blue-700"><Target className="h-3.5 w-3.5" /> Mission</h3><p className="text-xs text-blue-600/70">{builder.about_mission}</p></div>}
              {builder.about_vision && <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100/40"><h3 className="font-semibold flex items-center gap-1.5 mb-1.5 text-xs text-sky-700"><Eye className="h-3.5 w-3.5" /> Vision</h3><p className="text-xs text-sky-600/70">{builder.about_vision}</p></div>}
            </div>
          )}
          {builder.specializations?.length > 0 && <div className="flex flex-wrap gap-1.5">{builder.specializations.map((s: string) => <Badge key={s} className="text-[10px] rounded-md bg-slate-100 text-slate-600 border-0 px-2 py-0.5">{s}</Badge>)}</div>}
          {builder.awards?.length > 0 && <div className="space-y-1.5">{builder.awards.map((a: string, i: number) => <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100/40 text-xs text-slate-600"><Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />{a}</div>)}</div>}
          {builder.rera_number && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700"><Shield className="h-3.5 w-3.5" /> RERA: {builder.rera_number}</div>}
        </section>

        {/* Gallery */}
        {allImages.length > 0 && (
          <section ref={(el) => (sectionRefs.current["gallery"] = el)}>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><Play className="h-3.5 w-3.5 text-blue-500" /> Gallery</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
              {allImages.map((img: string, i: number) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer group border border-slate-200/50" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section ref={(el) => (sectionRefs.current["projects"] = el)}>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><Building2 className="h-3.5 w-3.5 text-blue-500" /> Projects</h2>
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200/50 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100">
                    {p.image || p.images?.[0] ? <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-slate-300 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-slate-700 truncate group-hover:text-blue-600">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{p.locality}, {p.city}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {p.status && <Badge className="text-[9px] h-4 bg-blue-50 text-blue-600 border-0 px-1.5">{p.status}</Badge>}
                      {p.price_min && <span className="text-[10px] font-semibold text-blue-600">{formatPrice(p.price_min)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Amenities */}
        {(builder.amenities?.length > 0 || builder.unit_types?.length > 0) && (
          <section ref={(el) => (sectionRefs.current["amenities"] = el)}>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><Sparkles className="h-3.5 w-3.5 text-blue-500" /> Amenities</h2>
            {builder.unit_types?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{builder.unit_types.map((u: string) => <Badge key={u} className="text-[10px] rounded-md bg-blue-50 text-blue-600 border-0 px-2 py-0.5">{u}</Badge>)}</div>}
            {builder.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {builder.amenities.map((a: string) => (
                  <div key={a} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200/50 text-xs text-slate-600 hover:border-blue-200 transition-colors">
                    <span className="text-sm">✦</span> {a}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Team */}
        {people.length > 0 && (
          <section ref={(el) => (sectionRefs.current["team"] = el)}>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><Users className="h-3.5 w-3.5 text-blue-500" /> Team</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {people.map((person: any, i: number) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200/50">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-blue-400" />}
                  </div>
                  <div className="min-w-0"><p className="font-medium text-xs text-slate-700 truncate">{person.name}</p><p className="text-[10px] text-slate-400 truncate">{person.role}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section ref={(el) => (sectionRefs.current["contact"] = el)}>
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3"><Phone className="h-3.5 w-3.5 text-blue-500" /> Contact</h2>
          <div className="p-4 rounded-xl bg-white border border-slate-200/50 shadow-sm">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button className="h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs" onClick={() => window.open(`tel:${builder.phone}`)}><Phone className="h-3.5 w-3.5" /> Call</Button>
              {builder.whatsapp ? (
                <Button variant="outline" className="h-10 rounded-lg border-green-200 text-green-600 hover:bg-green-50 gap-1.5 text-xs" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
              ) : builder.email ? (
                <Button variant="outline" className="h-10 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 text-xs" onClick={() => window.open(`mailto:${builder.email}`)}><Mail className="h-3.5 w-3.5" /> Email</Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {builder.rera_number && <div className="flex items-center gap-1.5 p-2 rounded-md bg-green-50 text-[10px] text-green-700"><Shield className="h-3 w-3" /> RERA: {builder.rera_number}</div>}
              {builder.website && <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 p-2 rounded-md text-[10px] text-blue-500 hover:text-blue-600 border border-slate-100 hover:border-blue-200"><Globe className="h-3 w-3" /> {builder.website.replace(/https?:\/\//, "")}</a>}
              {offices.map((o: any, i: number) => <div key={i} className="p-2 rounded-md bg-slate-50 text-[10px]"><span className="font-medium text-slate-600">{o.city}</span> — <span className="text-slate-400">{o.address}</span></div>)}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom fixed CTA bar (budget exclusive) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/50 px-3 py-2.5 md:hidden">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Button className="flex-1 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs font-medium" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-3.5 w-3.5" /> Call Builder
          </Button>
          {builder.whatsapp && (
            <Button variant="outline" className="h-10 rounded-lg border-green-200 text-green-600 hover:bg-green-50 px-4 text-xs" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-16 md:bottom-6 right-3 z-50 w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm"><ChevronUp className="h-3.5 w-3.5" /></button>}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain" />
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 rounded-lg bg-black/40 hover:bg-black/60 text-white h-8 w-8" onClick={() => setLightboxOpen(false)}><X className="h-4 w-4" /></Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg bg-black/40 hover:bg-black/60 text-white h-8 w-8" onClick={() => setLightboxIndex((p) => (p - 1 + allImages.length) % allImages.length)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-black/40 hover:bg-black/60 text-white h-8 w-8" onClick={() => setLightboxIndex((p) => (p + 1) % allImages.length)}><ChevronRight className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add padding for bottom bar on mobile */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default BudgetMicrosite;
