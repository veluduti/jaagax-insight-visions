import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Phone, MessageCircle, X, Calendar, ChevronUp, Mail, Globe, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuilderMicrositeHero from "@/components/builder/microsite/BuilderMicrositeHero";
import BuilderAboutSection from "@/components/builder/BuilderAboutSection";
import BuilderGallerySection from "@/components/builder/BuilderGallerySection";
import BuilderAmenitiesSection from "@/components/builder/BuilderAmenitiesSection";
import BuilderTeamSection from "@/components/builder/BuilderTeamSection";
import BuilderProjectsSection from "@/components/builder/BuilderProjectsSection";
import BuilderMicrositeContact from "@/components/builder/microsite/BuilderMicrositeContact";
import BuilderMicrositeStats from "@/components/builder/microsite/BuilderMicrositeStats";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "gallery", label: "Gallery" },
  { id: "projects", label: "Projects" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Leadership" },
  { id: "contact", label: "Contact" },
];

const BuilderProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("about");
  const [contactOpen, setContactOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchBuilder = async () => {
      const { data } = await supabase.from("builder_profiles" as any).select("*").eq("id", id).single();
      setBuilder(data as any);
      setLoading(false);
    };
    if (id) fetchBuilder();
  }, [id]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 600);
    setHeaderSolid(window.scrollY > 80);
    const navHeight = 120;
    for (const section of [...SECTIONS].reverse()) {
      const el = sectionRefs.current[section.id];
      if (el && el.getBoundingClientRect().top <= navHeight + 20) {
        setActiveSection(section.id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
            <div className="absolute -inset-4 bg-violet-500/10 rounded-3xl blur-xl animate-pulse" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading builder profile...</p>
        </div>
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-white">Builder Not Found</h1>
        <Button onClick={() => navigate("/")} className="bg-white text-black hover:bg-zinc-200 rounded-xl">Go Home</Button>
      </div>
    );
  }

  const tier = (builder.type as string) || "standard";

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* ─── Minimal Top Header ─── */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8 transition-all duration-500",
        headerSolid
          ? "bg-[#08080a]/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1 flex items-center justify-center gap-3">
          {builder.logo && (
            <div className="h-7 w-7 rounded-lg overflow-hidden bg-white/[0.06] p-0.5">
              <img src={builder.logo} alt="" className="w-full h-full rounded-md object-contain" />
            </div>
          )}
          <span className={cn(
            "text-xs font-medium tracking-[0.15em] uppercase transition-opacity duration-500",
            headerSolid ? "opacity-100 text-zinc-300" : "opacity-0"
          )}>
            {builder.builder_name}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setContactOpen(true)}
          className="text-xs rounded-xl px-5 bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          Enquire
        </Button>
      </header>

      {/* ─── Sticky Section Nav ─── */}
      <nav className={cn(
        "fixed top-14 left-0 right-0 z-40 h-11 transition-all duration-500",
        headerSolid
          ? "bg-[#08080a]/70 backdrop-blur-xl border-b border-white/[0.04]"
          : "bg-[#08080a]/40 backdrop-blur-md"
      )}>
        <div className="h-full overflow-x-auto scrollbar-none">
          <div className="flex items-center h-full gap-0 px-4 md:px-8 min-w-max max-w-5xl mx-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "h-full px-5 text-xs font-medium border-b-2 transition-all duration-300 whitespace-nowrap relative",
                  activeSection === s.id
                    ? "text-white border-violet-500"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                {s.label}
                {activeSection === s.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <div className="pt-[100px] relative z-10">
        <BuilderMicrositeHero builder={builder} tier={tier} onContact={() => setContactOpen(true)} />
      </div>

      {/* ─── Stats ─── */}
      <div className="px-4 md:px-8 max-w-6xl mx-auto -mt-8 relative z-20 mb-16">
        <BuilderMicrositeStats builder={builder} tier={tier} />
      </div>

      {/* ─── Sections ─── */}
      <div className="px-4 md:px-8 max-w-6xl mx-auto space-y-20 pb-32 relative z-10">
        {[
          { id: "about", title: "About", comp: <BuilderAboutSection builder={builder} tier={tier} /> },
          { id: "gallery", title: "Gallery & Media", comp: <BuilderGallerySection images={builder.images} videos={builder.videos} tier={tier} /> },
          { id: "projects", title: "Projects", comp: <BuilderProjectsSection builderName={builder.builder_name} /> },
          { id: "amenities", title: "Amenities", comp: <BuilderAmenitiesSection amenities={builder.amenities} unitTypes={builder.unit_types} tier={tier} /> },
          { id: "team", title: "Leadership", comp: <BuilderTeamSection keyPeople={builder.key_people} /> },
          { id: "contact", title: "Get in Touch", comp: <BuilderMicrositeContact builder={builder} tier={tier} /> },
        ].map((section) => (
          <div key={section.id} ref={(el) => (sectionRefs.current[section.id] = el)}>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-violet-500/60 to-transparent" />
                <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-violet-400/70">{section.title}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              </div>
            </div>
            {section.comp}
          </div>
        ))}
      </div>

      {/* ─── Floating Contact FAB ─── */}
      {!contactOpen && (
        <button
          onClick={() => setContactOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl opacity-40 blur-lg group-hover:opacity-60 transition-opacity" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-xl transition-transform group-hover:scale-105 active:scale-95">
              <Phone className="h-5 w-5 text-white" />
            </div>
          </div>
        </button>
      )}

      {/* ─── Scroll to Top ─── */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* ─── Contact Slide-in Panel ─── */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setContactOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 animate-slide-in-right shadow-2xl flex flex-col bg-[#0c0c0f] border-l border-white/[0.06]">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="font-semibold text-sm text-white">
                Contact {builder.builder_name}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06]">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button
                className="w-full h-12 text-sm gap-2 rounded-xl font-medium bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                onClick={() => window.open(`tel:${builder.phone}`)}
              >
                <Phone className="h-4 w-4" /> Call Now
              </Button>
              {builder.whatsapp && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm gap-2 rounded-xl border-emerald-500/20 text-emerald-400 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] hover:border-emerald-500/30"
                  onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              )}
              <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl border-white/[0.08] text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06]">
                <Calendar className="h-4 w-4" /> Schedule a Visit
              </Button>
              {builder.email && (
                <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl border-white/[0.08] text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06]" onClick={() => window.open(`mailto:${builder.email}`)}>
                  <Mail className="h-4 w-4" /> Email
                </Button>
              )}

              {/* Trust badges */}
              <div className="pt-6 space-y-3">
                {builder.rera_number && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12] text-xs text-emerald-400">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">RERA Verified</p>
                      <p className="text-[10px] opacity-60 font-mono mt-0.5">{builder.rera_number}</p>
                    </div>
                  </div>
                )}
                {builder.website && (
                  <a
                    href={builder.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3.5 rounded-xl border border-white/[0.06] text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12] transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    {builder.website.replace(/https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BuilderProfileDetail;
