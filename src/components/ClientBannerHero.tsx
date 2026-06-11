import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  IndianRupee,
  Sparkles,
  Search,
  Heart,
  Headphones,
  Wallet,
  Users,
  Activity,
  TrendingUp,
  CheckCircle2,
  Hotel,
  Building2,
  Lock,
  Star,
  ArrowRight,
} from "lucide-react";
import PropertySearchBar from "./PropertySearchBar";
import bannerBg from "@/assets/client-hero-banner.png.asset.json";

interface ClientBannerHeroProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSearchBar?: boolean;
}

/**
 * Slide 1 of the hero carousel — client-approved design rebuilt with REAL UI components.
 * Every visible action is an interactive button/route.
 * The center search widget reuses the existing PropertySearchBar (same logic as Slide 2).
 */
const ClientBannerHero = ({ activeTab, onTabChange, showSearchBar = true }: ClientBannerHeroProps) => {
  const navigate = useNavigate();

  const goComingSoon = (featureName: string) => () =>
    navigate("/coming-soon", { state: { featureName } });

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Insights",
      desc: "Smart recommendations just for you.",
      onClick: () => navigate("/ai-advisor"),
    },
    {
      icon: ShieldCheck,
      title: "100% Verified Properties",
      desc: "Ensuring trust and transparency.",
      onClick: () => navigate("/search?verified=1"),
    },
    {
      icon: IndianRupee,
      title: "Zero Hidden Costs",
      desc: "What you see is what you get.",
      onClick: () => navigate("/valuation"),
    },
    {
      icon: Sparkles,
      title: "India's most trusted",
      desc: "intelligent property platform",
      onClick: () => navigate("/trust-score"),
    },
  ];

  const quickActions = [
    { icon: Search, label: "Search", onClick: () => navigate("/search") },
    { icon: Heart, label: "Shortlist", onClick: () => navigate("/dashboard/buyer") },
    { icon: Headphones, label: "Expert Support", onClick: goComingSoon("Expert Support") },
    { icon: Wallet, label: "Smart Financing", onClick: goComingSoon("Smart Financing") },
    { icon: Users, label: "Instant Match", onClick: () => navigate("/ai-advisor") },
    { icon: Activity, label: "Real-time Updates", onClick: goComingSoon("Real-time Updates") },
  ];

  const stats = [
    { icon: ShieldCheck, value: "50K+", label: "Verified Properties" },
    { icon: Users, value: "100K+", label: "Happy Customers" },
    { icon: TrendingUp, value: "AI Powered", label: "Smart Insights" },
    { icon: Lock, value: "100%", label: "Secure & Transparent" },
    { icon: Headphones, value: "24/7", label: "Expert Support" },
    { icon: Star, value: "4.8/5", label: "User Rating" },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 pt-8 pb-6 lg:pt-12 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ===== LEFT: Headline + feature cards ===== */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.05] tracking-tight">
                <span className="text-foreground">Your Dream</span>
                <br />
                <span className="text-primary">Place Awaits</span>
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-muted-foreground">
                <span>FIND</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span>CONNECT</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span>GROW</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {features.map((f) => (
                <motion.button
                  key={f.title}
                  whileHover={{ x: 4 }}
                  onClick={f.onClick}
                  className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-card/80 backdrop-blur border border-border/50 hover:border-primary/40 hover:shadow-lg transition-all"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground leading-tight">{f.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ===== CENTER: floating cards + REAL search bar ===== */}
          <div className="lg:col-span-6 flex flex-col items-center gap-4">
            {/* New Property Posted card */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              className="w-full max-w-md flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-xl hover:shadow-2xl transition-all"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">New Property Posted!</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Property Live <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Pills row */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => navigate("/ai-advisor")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-foreground/90 text-background text-xs font-medium hover:bg-foreground transition"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Smart Insights
              </button>

              <div className="relative w-10 h-10 rounded-full bg-foreground flex items-center justify-center shadow-lg ring-4 ring-primary/20">
                <span className="text-primary font-black text-lg">X</span>
              </div>

              <button
                onClick={() => navigate("/search?verified=1")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-foreground/90 text-background text-xs font-medium hover:bg-foreground transition"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Properties
              </button>
            </div>

            {/* REAL Search widget */}
            {showSearchBar && (
              <div className="w-full">
                <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
              </div>
            )}

            {/* Bottom pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => navigate("/hotels")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition shadow"
              >
                <Hotel className="h-3.5 w-3.5" /> Book Hotel
              </button>
              <button
                onClick={goComingSoon("Smart Financing")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition shadow"
              >
                <Building2 className="h-3.5 w-3.5" /> Smart Financing
              </button>
            </div>
          </div>

          {/* ===== RIGHT: Quick action rail ===== */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5">
              {quickActions.map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ x: -4 }}
                  onClick={a.onClick}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-card/80 backdrop-blur border border-border/50 hover:border-primary/40 hover:shadow-lg transition-all"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <a.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{a.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Stats bar ===== */}
        <div className="mt-8 rounded-2xl bg-foreground text-background px-4 py-4 md:py-5 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm md:text-base font-bold leading-tight">{s.value}</div>
                  <div className="text-[11px] text-background/70 leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientBannerHero;
