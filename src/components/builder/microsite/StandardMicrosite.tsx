import { useState, useRef, useCallback, useEffect } from "react";
import BuilderLocationMap from "./BuilderLocationMap";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, MessageCircle, X, Mail, Globe, Shield, Star, MapPin,
  Award, Building2, ChevronUp, Users, User, ChevronRight, Download, Briefcase, Eye, Target, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { builder: any; }

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "floorplans", label: "Floor Plans" },
  { id: "gallery", label: "Gallery" },
  { id: "location", label: "Location" },
  { id: "trust", label: "Trust" },
  { id: "contact", label: "Contact" },
];

const StandardMicrosite = ({ builder }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  const [headerSolid, setHeaderSolid] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [fpTab, setFpTab] = useState("2BHK");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const floorPlans = builder?.floor_plans_data || {};
  const fpCategories = Object.keys(floorPlans).filter(k => Array.isArray(floorPlans[k]) && floorPlans[k].length > 0);
  const galleryImages = builder?.gallery_images || [];
  const hasFloorPlans = fpCategories.length > 0;

  useEffect(() => {
    if (fpCategories.length > 0 && !fpCategories.includes(fpTab)) setFpTab(fpCategories[0]);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").ilike("builder_name", `%${builder.builder_name}%`).limit(20);
      if (data) setProjects(data);
    };
    if (builder.builder_name) fetch();
  }, [builder.builder_name]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 500);
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

  const handleDownloadBrochure = () => {
    if (builder.brochure_url) {
      window.open(builder.brochure_url, "_blank");
    } else {
      toast.info("Brochure download will be available soon.");
    }
  };

  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#1a2a1a]">
      {/* HEADER */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8 transition-all duration-300",
        headerSolid ? "bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" : "bg-transparent"
      )}>
        <button onClick={() => navigate(-1)} className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors", headerSolid ? "text-gray-500 hover:text-gray-800" : "text-white/70 hover:text-white")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {headerSolid && builder.logo && <img src={builder.logo} alt="" className="h-7 w-7 rounded-lg object-contain" />}
          <span className={cn("text-xs font-semibold tracking-wider uppercase transition-all", headerSolid ? "opacity-100 text-gray-800" : "opacity-0")}>{builder.builder_name}</span>
        </div>
        <div className="flex items-center gap-2">
          {builder.id && (
            <button onClick={() => navigate(`/edit-builder-profile/${builder.id}`)} className={cn("transition-colors", headerSolid ? "text-gray-400 hover:text-gray-700" : "text-white/50 hover:text-white")}>
              <Edit className="h-4 w-4" />
            </button>
          )}
          <Button size="sm" onClick={() => setContactOpen(true)} className="text-xs rounded-full px-5 bg-emerald-600 text-white hover:bg-emerald-700 font-medium">Enquire</Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[55vh] min-h-[360px] flex items-end overflow-hidden">
        {(builder.hero_image || builder.images?.[0]) ? (
          <img src={builder.hero_image || builder.images[0]} alt={builder.builder_name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 to-emerald-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 md:px-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {builder.logo && <img src={builder.logo} alt="" className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md p-1.5 border border-white/15 object-contain" />}
                <Badge className="bg-white/10 backdrop-blur-md text-white/90 border border-white/15 text-[10px] font-medium px-3 py-1 rounded-full">Standard Builder</Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{builder.builder_name}</h1>
              {builder.tagline && <p className="text-white/50 text-sm max-w-md">{builder.tagline}</p>}
              {builder.customer_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-white text-sm font-medium">{builder.customer_rating}/5</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="lg" onClick={() => scrollToSection("projects")} className="rounded-full px-6 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-lg">
                <Building2 className="h-4 w-4 mr-1.5" /> View Projects
              </Button>
              <Button size="lg" variant="outline" onClick={handleDownloadBrochure} className="rounded-full px-6 border-white/25 text-white hover:bg-white/10 bg-transparent font-medium">
                <Download className="h-4 w-4 mr-1.5" /> Brochure
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Projects Completed", value: builder.completed_projects_count || 0 },
              { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN") },
              { label: "Years Experience", value: builder.years_of_experience ? `${builder.years_of_experience}+` : "—" },
              { label: "Cities Active", value: builder.operating_cities?.length || 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-emerald-700">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION NAV */}
      <nav className="sticky top-14 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center h-11 gap-1 px-5 md:px-8 min-w-max">
            {SECTIONS.filter(s => {
              if (s.id === "floorplans" && !hasFloorPlans) return false;
              if (s.id === "gallery" && galleryImages.length === 0) return false;
              return true;
            }).map(s => (
              <button key={s.id} onClick={() => scrollToSection(s.id)} className={cn(
                "px-4 py-2 text-xs font-medium rounded-full transition-all whitespace-nowrap",
                activeSection === s.id ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              )}>{s.label}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 space-y-8">
        {/* About */}
        <section ref={el => (sectionRefs.current["about"] = el)} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-600" /> About {builder.builder_name}</h2>
          {builder.description && (
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-600 leading-relaxed">{builder.description}</p>
            </div>
          )}
          {/* Highlights */}
          {(builder.bhk_types_offered || builder.size_range || builder.land_area) && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Configuration", value: builder.bhk_types_offered },
                { label: "Size Range", value: builder.size_range },
                { label: "Land Area", value: builder.land_area },
                { label: "Total Units", value: builder.total_units_count },
                { label: "Floors", value: builder.total_floors_count },
              ].filter(h => h.value).map(h => (
                <div key={h.label} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/50 text-center">
                  <p className="text-sm font-bold text-emerald-700">{h.value}</p>
                  <p className="text-[10px] text-emerald-600/60 mt-0.5">{h.label}</p>
                </div>
              ))}
            </div>
          )}
          {(builder.about_mission || builder.about_vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builder.about_mission && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100/50">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-emerald-800"><Target className="h-3.5 w-3.5" /> Mission</h3>
                  <p className="text-xs text-emerald-700/70">{builder.about_mission}</p>
                </div>
              )}
              {builder.about_vision && (
                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100/50">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-teal-800"><Eye className="h-3.5 w-3.5" /> Vision</h3>
                  <p className="text-xs text-teal-700/70">{builder.about_vision}</p>
                </div>
              )}
            </div>
          )}
          {builder.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-2">{builder.specializations.map((s: string) => <Badge key={s} className="text-xs rounded-full bg-gray-100 text-gray-600 border-0 px-3 py-1">{s}</Badge>)}</div>
          )}
        </section>

        {/* Projects */}
        {projects.length > 0 && (
          <section ref={el => (sectionRefs.current["projects"] = el)} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" /> Projects</h2>
              <Button variant="outline" size="sm" onClick={handleDownloadBrochure} className="rounded-full text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Download className="h-3.5 w-3.5" /> Brochure
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <div key={p.id} className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="h-36 bg-gray-100 overflow-hidden">
                    {p.image || p.images?.[0] ? (
                      <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Building2 className="h-8 w-8 text-gray-200" /></div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-800 group-hover:text-emerald-700 transition-colors truncate">{p.name}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.bhk_types && <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{p.bhk_types}</span>}
                        {p.status && <Badge className="text-[10px] h-5 bg-emerald-50 text-emerald-600 border-0">{p.status}</Badge>}
                      </div>
                      {p.price_min && <span className="text-xs font-bold text-emerald-600">{formatPrice(p.price_min)}{p.price_max ? ` – ${formatPrice(p.price_max)}` : ""}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Floor Plans */}
        {hasFloorPlans && (
          <section ref={el => (sectionRefs.current["floorplans"] = el)} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" /> Floor Plans</h2>
            <div className="flex gap-2 mb-4">
              {fpCategories.map(cat => (
                <Button key={cat} variant={fpTab === cat ? "default" : "outline"} size="sm" onClick={() => setFpTab(cat)}
                  className={fpTab === cat ? "bg-emerald-600 hover:bg-emerald-700" : ""}>{cat}</Button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(floorPlans[fpTab] || []).map((fp: any, i: number) => (
                <div key={i} className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  {fp.image && (
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      <img src={fp.image} alt={fp.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-800">{fp.name}</h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{fp.facing} facing</span>
                      {fp.priceRange && <span className="font-bold text-emerald-600">{fp.priceRange}</span>}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>{fp.beds} Bed</span>
                      <span>{fp.baths} Bath</span>
                      <span>{fp.carpetArea || fp.size}</span>
                    </div>
                    {fp.highlights?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {fp.highlights.map((h: string) => <Badge key={h} className="text-[9px] bg-emerald-50 text-emerald-600 border-0 px-2 py-0.5">{h}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <section ref={el => (sectionRefs.current["gallery"] = el)} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Eye className="h-4 w-4 text-emerald-600" /> Gallery</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {galleryImages.map((img: string, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                  <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Location */}
        <section ref={el => (sectionRefs.current["location"] = el)} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Location</h2>
          {(builder.latitude && builder.longitude) && (
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-3">
              <BuilderLocationMap lat={builder.latitude} lng={builder.longitude} builderName={builder.builder_name} height="300px" />
            </div>
          )}
          {builder.project_location && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" /> {builder.project_location}
            </div>
          )}
          {builder.google_maps_link && (
            <a href={builder.google_maps_link} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
              </Button>
            </a>
          )}
          {builder.operating_cities?.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-3">Active in {builder.operating_cities.length} {builder.operating_cities.length === 1 ? 'city' : 'cities'}</p>
              <div className="flex flex-wrap gap-2">
                {builder.operating_cities.map((city: string) => (
                  <div key={city} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
                    <MapPin className="h-3.5 w-3.5" /> {city}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Trust */}
        <section ref={el => (sectionRefs.current["trust"] = el)} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" /> Trust & Credibility</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Rating", value: builder.customer_rating ? `${builder.customer_rating}/5` : "—" },
              { label: "Projects Done", value: builder.completed_projects_count || 0 },
              { label: "Experience", value: builder.years_of_experience ? `${builder.years_of_experience} yrs` : "—" },
              { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN") },
            ].map(t => (
              <div key={t.label} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <p className="text-xl font-bold text-emerald-700">{t.value}</p>
                <p className="text-[11px] text-gray-400 mt-1">{t.label}</p>
              </div>
            ))}
          </div>
          {builder.rera_number && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
              <Shield className="h-4 w-4" /> RERA Verified: <span className="font-mono font-medium">{builder.rera_number}</span>
            </div>
          )}
          {builder.awards?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {builder.awards.map((a: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/60 border border-amber-100/50 text-xs text-gray-600"><Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />{a}</div>
              ))}
            </div>
          )}
        </section>

        {/* Contact */}
        <section ref={el => (sectionRefs.current["contact"] = el)} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" /> Contact</h2>
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Button className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={() => window.open(`tel:${builder.phone}`)}>
                <Phone className="h-4 w-4" /> {builder.phone}
              </Button>
              {builder.whatsapp ? (
                <Button variant="outline" className="h-11 rounded-xl border-green-200 text-green-600 hover:bg-green-50 gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              ) : builder.email ? (
                <Button variant="outline" className="h-11 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}>
                  <Mail className="h-4 w-4" /> Email
                </Button>
              ) : null}
            </div>
            {builder.website && (
              <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 text-xs text-gray-500 hover:text-emerald-700 transition-colors">
                <Globe className="h-3.5 w-3.5" /> {builder.website.replace(/https?:\/\//, "")}
              </a>
            )}
          </div>
        </section>
      </div>

      {/* FAB */}
      <button onClick={() => setContactOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">
        <Phone className="h-5 w-5 text-white" />
      </button>

      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><ChevronUp className="h-4 w-4" /></button>}

      {/* Contact Slide */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={() => setContactOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 shadow-xl flex flex-col bg-white border-l border-gray-100 animate-slide-in-right">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Contact {builder.builder_name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8 rounded-xl"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button className="w-full h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2" onClick={() => window.open(`tel:${builder.phone}`)}><Phone className="h-4 w-4" /> Call Now</Button>
              {builder.whatsapp && <Button variant="outline" className="w-full h-12 rounded-xl border-green-200 text-green-600 hover:bg-green-50 gap-2" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>}
              {builder.email && <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}><Mail className="h-4 w-4" /> Email</Button>}
              <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2" onClick={handleDownloadBrochure}><Download className="h-4 w-4" /> Download Brochure</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StandardMicrosite;
