import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Phone, MessageCircle, X, Calendar, ChevronUp, Mail, Globe, Shield } from "lucide-react";
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

const tierTheme = {
  luxury: {
    page: "bg-[#070a06] text-[#e8e4dc]",
    headerBg: "bg-[#0c0f0a]/90 backdrop-blur-2xl border-b border-[#2a3a20]/40",
    navBg: "bg-[#0c0f0a]/85 backdrop-blur-xl border-b border-[#2a3a20]/30",
    navItem: "text-[#8a9a78] hover:text-[#c8b882]",
    navActive: "text-[#c8b882] border-[#c8b882]",
    headerName: "text-[#c8b882] tracking-[0.15em] uppercase text-xs font-medium",
    enquireBtn: "bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-[#0c0f0a] hover:from-[#c8a83e] hover:to-[#e4bf47] font-semibold shadow-[0_4px_20px_rgba(212,175,55,0.25)]",
    backBtn: "text-[#8a9a78] hover:text-[#c8b882] hover:bg-[#1a2a14]/60",
    fabClass: "bg-gradient-to-br from-[#1a3a14] to-[#0d1f0a] text-[#c8b882] border border-[#2a4a20]/50 shadow-[0_8px_40px_rgba(40,80,30,0.4),inset_0_1px_0_rgba(200,184,130,0.1)] hover:shadow-[0_12px_50px_rgba(40,80,30,0.6)]",
    contactPanel: "bg-[#0c0f0a] border-l border-[#2a3a20]/40",
    contactTitle: "text-[#c8b882]",
    contactPrimary: "bg-gradient-to-r from-[#1a3a14] to-[#245a1c] text-[#c8b882] border border-[#2a4a20]/40 hover:from-[#245a1c] hover:to-[#2e6a24]",
    sectionHeading: "text-[#c8b882]",
    sectionLine: "bg-gradient-to-r from-[#c8b882] via-[#d4af37] to-transparent",
    scrollTop: "bg-[#1a2a14]/80 text-[#8a9a78] border border-[#2a3a20]/30 hover:text-[#c8b882]",
  },
  standard: {
    page: "bg-[#f7f8f6] dark:bg-[#0f1310] text-foreground",
    headerBg: "bg-white/90 dark:bg-[#111614]/90 backdrop-blur-2xl border-b border-[#e0e8dc] dark:border-[#1e2e1a]/50",
    navBg: "bg-white/85 dark:bg-[#111614]/85 backdrop-blur-xl border-b border-[#e0e8dc]/60 dark:border-[#1e2e1a]/40",
    navItem: "text-[#6b7b68] dark:text-[#7a8a76] hover:text-[#2a5a24] dark:hover:text-[#6abd5e]",
    navActive: "text-[#2a5a24] dark:text-[#6abd5e] border-[#2a5a24] dark:border-[#6abd5e]",
    headerName: "text-[#2a3a28] dark:text-[#d0daca] font-semibold text-sm",
    enquireBtn: "bg-[#2a5a24] text-white hover:bg-[#1e4a1a] shadow-[0_4px_16px_rgba(42,90,36,0.2)]",
    backBtn: "text-[#6b7b68] hover:text-[#2a5a24] hover:bg-[#eaf2e8] dark:hover:bg-[#1a2a14]/40",
    fabClass: "bg-[#2a5a24] text-white shadow-[0_8px_30px_rgba(42,90,36,0.3)] hover:bg-[#1e4a1a]",
    contactPanel: "bg-white dark:bg-[#111614] border-l border-[#e0e8dc] dark:border-[#1e2e1a]/40",
    contactTitle: "text-[#2a3a28] dark:text-[#d0daca]",
    contactPrimary: "bg-[#2a5a24] text-white hover:bg-[#1e4a1a]",
    sectionHeading: "text-[#2a3a28] dark:text-[#d0daca]",
    sectionLine: "bg-gradient-to-r from-[#2a5a24] to-transparent",
    scrollTop: "bg-white/80 dark:bg-[#1a2a14]/60 text-[#6b7b68] border border-[#e0e8dc] dark:border-[#2a3a20]/30 hover:text-[#2a5a24]",
  },
  budget: {
    page: "bg-[#f4f7fa] dark:bg-slate-950 text-foreground",
    headerBg: "bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border-b border-blue-100/60 dark:border-blue-900/30",
    navBg: "bg-white/88 dark:bg-slate-900/88 backdrop-blur-lg border-b border-blue-100/40 dark:border-blue-900/20",
    navItem: "text-slate-500 hover:text-blue-700 dark:hover:text-blue-300",
    navActive: "text-blue-700 dark:text-blue-400 border-blue-600 dark:border-blue-400",
    headerName: "text-slate-700 dark:text-slate-200 font-semibold text-sm",
    enquireBtn: "bg-blue-600 text-white hover:bg-blue-700",
    backBtn: "text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20",
    fabClass: "bg-blue-600 text-white shadow-lg hover:bg-blue-700",
    contactPanel: "bg-white dark:bg-slate-900 border-l border-blue-100 dark:border-blue-800",
    contactTitle: "text-slate-800 dark:text-white",
    contactPrimary: "bg-blue-600 text-white hover:bg-blue-700",
    sectionHeading: "text-slate-800 dark:text-slate-100",
    sectionLine: "bg-gradient-to-r from-blue-500 to-transparent",
    scrollTop: "bg-white/80 dark:bg-slate-800/60 text-slate-400 border border-blue-100 dark:border-blue-800/30 hover:text-blue-600",
  },
};

const BuilderProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("about");
  const [contactOpen, setContactOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Builder Not Found</h1>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const tier = (builder.type as string) || "standard";
  const t = tierTheme[tier as keyof typeof tierTheme] || tierTheme.standard;

  return (
    <div className={cn("min-h-screen", t.page)}>
      {/* ─── Minimal Top Header ─── */}
      <header className={cn("fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8", t.headerBg)}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className={cn("gap-1.5 rounded-xl", t.backBtn)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1 flex items-center justify-center gap-3">
          {builder.logo && (
            <img src={builder.logo} alt="" className="h-7 w-7 rounded-lg object-contain" />
          )}
          <span className={t.headerName}>{builder.builder_name}</span>
        </div>
        <Button size="sm" onClick={() => setContactOpen(true)} className={cn("text-xs rounded-xl px-5", t.enquireBtn)}>
          Enquire
        </Button>
      </header>

      {/* ─── Sticky Section Nav ─── */}
      <nav className={cn("fixed top-14 left-0 right-0 z-40 h-11", t.navBg)}>
        <div className="h-full overflow-x-auto scrollbar-none">
          <div className="flex items-center h-full gap-0 px-4 md:px-8 min-w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "h-full px-5 text-xs font-medium border-b-2 transition-all duration-300 whitespace-nowrap",
                  activeSection === s.id ? t.navActive : cn("border-transparent", t.navItem)
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <div className="pt-[100px]">
        <BuilderMicrositeHero builder={builder} tier={tier} onContact={() => setContactOpen(true)} />
      </div>

      {/* ─── Stats ─── */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto -mt-10 relative z-20 mb-12">
        <BuilderMicrositeStats builder={builder} tier={tier} />
      </div>

      {/* ─── Sections ─── */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-16 pb-28">
        <div ref={(el) => (sectionRefs.current["about"] = el)}>
          <SectionHeading title="About" tier={tier} theme={t} />
          <BuilderAboutSection builder={builder} tier={tier} />
        </div>

        <div ref={(el) => (sectionRefs.current["gallery"] = el)}>
          <SectionHeading title="Gallery & Media" tier={tier} theme={t} />
          <BuilderGallerySection images={builder.images} videos={builder.videos} tier={tier} />
        </div>

        <div ref={(el) => (sectionRefs.current["projects"] = el)}>
          <SectionHeading title="Projects" tier={tier} theme={t} />
          <BuilderProjectsSection builderName={builder.builder_name} />
        </div>

        <div ref={(el) => (sectionRefs.current["amenities"] = el)}>
          <SectionHeading title="Amenities" tier={tier} theme={t} />
          <BuilderAmenitiesSection amenities={builder.amenities} unitTypes={builder.unit_types} tier={tier} />
        </div>

        <div ref={(el) => (sectionRefs.current["team"] = el)}>
          <SectionHeading title="Leadership" tier={tier} theme={t} />
          <BuilderTeamSection keyPeople={builder.key_people} />
        </div>

        <div ref={(el) => (sectionRefs.current["contact"] = el)}>
          <SectionHeading title="Get in Touch" tier={tier} theme={t} />
          <BuilderMicrositeContact builder={builder} tier={tier} />
        </div>
      </div>

      {/* ─── Floating Contact FAB ─── */}
      {!contactOpen && (
        <button
          onClick={() => setContactOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95",
            t.fabClass
          )}
        >
          <Phone className="h-5 w-5" />
        </button>
      )}

      {/* ─── Scroll to Top ─── */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn("fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all", t.scrollTop)}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* ─── Contact Slide-in Panel ─── */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={() => setContactOpen(false)} />
          <div className={cn(
            "fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 animate-slide-in-right shadow-2xl flex flex-col",
            t.contactPanel
          )}>
            <div className="flex items-center justify-between p-5 border-b border-border/20">
              <h3 className={cn("font-semibold text-base", t.contactTitle)}>
                Contact {builder.builder_name}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8 rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button
                className={cn("w-full h-12 text-sm gap-2 rounded-xl font-medium", t.contactPrimary)}
                onClick={() => window.open(`tel:${builder.phone}`)}
              >
                <Phone className="h-4 w-4" /> Call Now
              </Button>
              {builder.whatsapp && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm gap-2 rounded-xl border-emerald-600/30 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              )}
              <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl">
                <Calendar className="h-4 w-4" /> Schedule a Visit
              </Button>
              {builder.email && (
                <Button variant="outline" className="w-full h-12 text-sm gap-2 rounded-xl" onClick={() => window.open(`mailto:${builder.email}`)}>
                  <Mail className="h-4 w-4" /> Email
                </Button>
              )}

              {/* Trust badges in panel */}
              <div className="pt-6 space-y-3">
                {builder.rera_number && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">RERA Verified</p>
                      <p className="text-[10px] opacity-70 font-mono mt-0.5">{builder.rera_number}</p>
                    </div>
                  </div>
                )}
                {builder.website && (
                  <a
                    href={builder.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border/30 text-xs text-muted-foreground hover:border-border/60 transition-colors"
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

const SectionHeading = ({ title, tier, theme }: { title: string; tier: string; theme: any }) => (
  <div className="mb-5">
    <h2 className={cn("text-xl font-bold tracking-tight", theme.sectionHeading)}>
      {title}
    </h2>
    <div className={cn("h-[2px] w-14 mt-2 rounded-full", theme.sectionLine)} />
  </div>
);

export default BuilderProfileDetail;
