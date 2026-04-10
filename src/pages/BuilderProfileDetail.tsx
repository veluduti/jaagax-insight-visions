import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Phone, MessageCircle, X, Calendar, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuilderMicrositeHero from "@/components/builder/microsite/BuilderMicrositeHero";
import BuilderAboutSection from "@/components/builder/BuilderAboutSection";
import BuilderGallerySection from "@/components/builder/BuilderGallerySection";
import BuilderAmenitiesSection from "@/components/builder/BuilderAmenitiesSection";
import BuilderTeamSection from "@/components/builder/BuilderTeamSection";
import BuilderProjectsSection from "@/components/builder/BuilderProjectsSection";
import BuilderMicrositeContact from "@/components/builder/microsite/BuilderMicrositeContact";
import BuilderStatsGrid from "@/components/builder/BuilderStatsGrid";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "gallery", label: "Gallery" },
  { id: "projects", label: "Projects" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Team" },
  { id: "contact", label: "Contact" },
];

const tierConfig: Record<string, { accent: string; navBg: string; headerBg: string; fabClass: string; sectionNav: string; activeTab: string }> = {
  luxury: {
    accent: "from-amber-500 to-yellow-400",
    navBg: "bg-[#0d0d0d]/95 backdrop-blur-xl border-b border-amber-500/20",
    headerBg: "bg-[#0d0d0d]/95 backdrop-blur-xl border-b border-amber-500/10",
    fabClass: "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_8px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_8px_40px_rgba(245,158,11,0.6)]",
    sectionNav: "text-amber-200/60 hover:text-amber-100",
    activeTab: "text-amber-400 border-amber-400",
  },
  standard: {
    accent: "from-primary to-emerald-400",
    navBg: "bg-background/95 backdrop-blur-xl border-b border-border/50",
    headerBg: "bg-background/95 backdrop-blur-xl border-b border-border/30",
    fabClass: "bg-primary text-primary-foreground shadow-glow hover:shadow-elegant",
    sectionNav: "text-muted-foreground hover:text-foreground",
    activeTab: "text-primary border-primary",
  },
  budget: {
    accent: "from-blue-500 to-cyan-400",
    navBg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-blue-200/50 dark:border-blue-800/30",
    headerBg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-blue-100/50 dark:border-blue-900/30",
    fabClass: "bg-blue-600 text-white shadow-lg hover:bg-blue-700",
    sectionNav: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
    activeTab: "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400",
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
  const navRef = useRef<HTMLDivElement>(null);

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
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= navHeight + 20) {
          setActiveSection(section.id);
          break;
        }
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
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
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
  const config = tierConfig[tier] || tierConfig.standard;

  return (
    <div className={cn("min-h-screen", tier === "luxury" ? "bg-[#0a0a0a] text-white" : tier === "budget" ? "bg-slate-50 dark:bg-slate-950" : "bg-background")}>
      {/* Minimal Top Header */}
      <header className={cn("fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8", config.headerBg)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className={cn("gap-1.5", tier === "luxury" ? "text-amber-200 hover:text-amber-100 hover:bg-amber-500/10" : "")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1 flex items-center justify-center gap-3">
          {builder.logo && (
            <img src={builder.logo} alt="" className="h-7 w-7 rounded-md object-contain" />
          )}
          <span className={cn("font-semibold text-sm truncate", tier === "luxury" ? "text-amber-100 tracking-wide" : "")}>
            {builder.builder_name}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setContactOpen(true)}
          className={cn(
            "text-xs",
            tier === "luxury"
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : tier === "budget"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : ""
          )}
        >
          Enquire
        </Button>
      </header>

      {/* Sticky Section Nav */}
      <nav
        ref={navRef}
        className={cn("fixed top-14 left-0 right-0 z-40 h-11", config.navBg)}
      >
        <div className="h-full overflow-x-auto scrollbar-none">
          <div className="flex items-center h-full gap-0 px-4 md:px-8 min-w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "h-full px-4 text-xs font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                  activeSection === s.id
                    ? config.activeTab
                    : cn("border-transparent", config.sectionNav)
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-[100px]">
        <BuilderMicrositeHero builder={builder} tier={tier} onContact={() => setContactOpen(true)} />
      </div>

      {/* Stats */}
      <div className={cn("px-4 md:px-8 max-w-7xl mx-auto -mt-8 relative z-20 mb-10")}>
        <BuilderStatsGrid builder={builder} />
      </div>

      {/* Sections */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-12 pb-24">
        <div ref={(el) => (sectionRefs.current["about"] = el)}>
          <SectionHeading title="About" tier={tier} />
          <BuilderAboutSection builder={builder} />
        </div>

        <div ref={(el) => (sectionRefs.current["gallery"] = el)}>
          <SectionHeading title="Gallery & Media" tier={tier} />
          <BuilderGallerySection images={builder.images} videos={builder.videos} />
        </div>

        <div ref={(el) => (sectionRefs.current["projects"] = el)}>
          <SectionHeading title="Projects" tier={tier} />
          <BuilderProjectsSection builderName={builder.builder_name} />
        </div>

        <div ref={(el) => (sectionRefs.current["amenities"] = el)}>
          <SectionHeading title="Amenities" tier={tier} />
          <BuilderAmenitiesSection amenities={builder.amenities} unitTypes={builder.unit_types} />
        </div>

        <div ref={(el) => (sectionRefs.current["team"] = el)}>
          <SectionHeading title="Leadership" tier={tier} />
          <BuilderTeamSection keyPeople={builder.key_people} />
        </div>

        <div ref={(el) => (sectionRefs.current["contact"] = el)}>
          <SectionHeading title="Get in Touch" tier={tier} />
          <BuilderMicrositeContact builder={builder} tier={tier} />
        </div>
      </div>

      {/* Floating Contact FAB */}
      {!contactOpen && (
        <button
          onClick={() => setContactOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95",
            config.fabClass
          )}
        >
          <Phone className="h-5 w-5" />
        </button>
      )}

      {/* Scroll-to-Top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-muted/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Contact Slide-in Panel */}
      {contactOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setContactOpen(false)} />
          <div className={cn(
            "fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 animate-slide-in-right shadow-2xl flex flex-col",
            tier === "luxury" ? "bg-[#111111] border-l border-amber-500/20" : tier === "budget" ? "bg-white dark:bg-slate-900 border-l border-blue-200 dark:border-blue-800" : "bg-background border-l border-border"
          )}>
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className={cn("font-semibold", tier === "luxury" ? "text-amber-100" : "")}>Contact {builder.builder_name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setContactOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <Button
                className={cn("w-full h-12 text-sm gap-2", tier === "luxury" ? "bg-amber-500 text-black hover:bg-amber-400" : tier === "budget" ? "bg-blue-600 hover:bg-blue-700" : "")}
                onClick={() => window.open(`tel:${builder.phone}`)}
              >
                <Phone className="h-4 w-4" /> Call Now
              </Button>
              {builder.whatsapp && (
                <Button
                  variant="outline"
                  className={cn("w-full h-12 text-sm gap-2", tier === "luxury" ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20")}
                  onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-12 text-sm gap-2"
                onClick={() => setContactOpen(false)}
              >
                <Calendar className="h-4 w-4" /> Schedule a Visit
              </Button>

              {/* Quick Info */}
              <div className="pt-4 space-y-3 text-sm">
                {builder.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">✉️</span> {builder.email}
                  </div>
                )}
                {builder.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">🌐</span>
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-xs truncate">
                      {builder.website.replace(/https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {builder.rera_number && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                    ✅ RERA: {builder.rera_number}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SectionHeading = ({ title, tier }: { title: string; tier: string }) => (
  <div className="mb-4">
    <h2
      className={cn(
        "text-xl font-bold tracking-tight",
        tier === "luxury" ? "text-amber-100" : tier === "budget" ? "text-slate-800 dark:text-slate-100" : ""
      )}
    >
      {title}
    </h2>
    <div
      className={cn(
        "h-0.5 w-12 mt-1.5 rounded-full",
        tier === "luxury" ? "bg-gradient-to-r from-amber-500 to-yellow-400" : tier === "budget" ? "bg-blue-500" : "bg-primary"
      )}
    />
  </div>
);

export default BuilderProfileDetail;
