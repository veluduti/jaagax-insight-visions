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
import skylineImg from "@/assets/hero-skyline.jpg";
import villaImg from "@/assets/hero-villa.jpg";
import hotelImg from "@/assets/hero-hotel.jpg";
import familyImg from "@/assets/hero-family.jpg";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSearchBar?: boolean;
}

/**
 * Slide 1 — client-approved hero, fully rebuilt with code.
 * Diagonal photo collage (skyline TL, villa TR, hotel BL, family BC) sits behind
 * a left content column, floating cards, and a real working search widget.
 * No uploaded mockup image is rendered.
 */
const ClientBannerHero = ({ activeTab, onTabChange, showSearchBar = true }: Props) => {
  const navigate = useNavigate();
  const goComingSoon = (featureName: string) => () =>
    navigate("/coming-soon", { state: { featureName } });

  const features = [
    { icon: Brain, title: "AI-Powered Insights", desc: "Smart recommendations just for you.", onClick: () => navigate("/ai-advisor") },
    { icon: ShieldCheck, title: "100% Verified Properties", desc: "Ensuring trust and transparency.", onClick: () => navigate("/search?verified=1") },
    { icon: IndianRupee, title: "Zero Hidden Costs", desc: "What you see is what you get.", onClick: () => navigate("/valuation") },
  ];

  const rightActions = [
    { icon: Search, label: "Search", onClick: () => navigate("/search") },
    { icon: Heart, label: "Shortlist", onClick: () => navigate("/dashboard/buyer") },
    { icon: Headphones, label: "Expert Support", onClick: goComingSoon("Expert Support") },
  ];

  const rightCards = [
    { icon: Wallet, title: "Smart Financing", desc: "Pre-Approved Up to ₹5 Cr", onClick: goComingSoon("Smart Financing") },
    { icon: Users, title: "Instant Match", desc: "Connect with right buyers & sellers", onClick: () => navigate("/ai-advisor") },
    { icon: Activity, title: "Real-time Updates", desc: "on new properties", onClick: goComingSoon("Real-time Updates") },
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
    <section className="relative w-full bg-background overflow-hidden">
      <div className="container mx-auto px-3 md:px-4 pt-4 pb-4 lg:pt-6">
        {/* Main 12-col canvas */}
        <div className="relative grid grid-cols-12 gap-3 lg:gap-4 min-h-[560px] lg:min-h-[640px]">

          {/* ============ LEFT TEXT COLUMN (white wedge) ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-10 bg-card lg:bg-transparent rounded-2xl p-4 lg:p-2">
            <h1 className="font-serif leading-[1.02] tracking-tight text-4xl md:text-5xl lg:text-[3.1rem]">
              <span className="text-foreground">Your Dream</span>
              <br />
              <span className="text-primary">Place Awaits</span>
            </h1>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-foreground/80">
              <span>FIND</span><span className="h-1 w-1 rounded-full bg-primary" />
              <span>CONNECT</span><span className="h-1 w-1 rounded-full bg-primary" />
              <span>GROW</span>
            </div>

            <div className="mt-5 space-y-2.5">
              {features.map((f) => (
                <motion.button
                  key={f.title}
                  whileHover={{ x: 3 }}
                  onClick={f.onClick}
                  className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground leading-tight">{f.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                  </div>
                </motion.button>
              ))}
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => navigate("/trust-score")}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground leading-tight">
                  India's most trusted
                  <div className="font-medium text-muted-foreground text-xs mt-0.5">intelligent property platform</div>
                </div>
              </motion.button>
            </div>
          </div>

          {/* ============ CENTER PHOTO COLLAGE + WIDGETS ============ */}
          <div className="col-span-12 lg:col-span-6 relative min-h-[460px] lg:min-h-[640px]">
            {/* Diagonal collage — 4 photos arranged with clipped tiles + neon edge */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-foreground/95">
              {/* TOP-LEFT: skyline */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${skylineImg})`,
                  clipPath: "polygon(0 0, 100% 0, 60% 55%, 0 60%)",
                }}
              />
              {/* TOP-RIGHT: villa */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${villaImg})`,
                  clipPath: "polygon(60% 0, 100% 0, 100% 60%, 50% 50%)",
                }}
              />
              {/* BOTTOM-LEFT: hotel */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${hotelImg})`,
                  clipPath: "polygon(0 60%, 45% 55%, 35% 100%, 0 100%)",
                }}
              />
              {/* BOTTOM-CENTER+RIGHT: family */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${familyImg})`,
                  clipPath: "polygon(35% 100%, 45% 55%, 60% 50%, 100% 60%, 100% 100%)",
                }}
              />
              {/* Neon diagonal edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="edge" x1="0" x2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <g stroke="url(#edge)" strokeWidth="0.35" fill="none">
                  <line x1="0" y1="60" x2="60" y2="55" />
                  <line x1="60" y1="55" x2="100" y2="60" />
                  <line x1="50" y1="50" x2="35" y2="100" />
                  <line x1="50" y1="50" x2="45" y2="100" />
                </g>
              </svg>
              {/* subtle vignette for legibility of overlaid widgets */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30" />
            </div>

            {/* Floating: New Property Posted (top center) */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-[88%] max-w-sm flex items-center gap-3 p-3 rounded-2xl bg-card/95 backdrop-blur border border-border shadow-2xl hover:shadow-glow transition z-20"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold">New Property Posted!</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                    Property Live <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Floating pill: Smart Insights (mid-left) */}
            <button
              onClick={() => navigate("/ai-advisor")}
              className="absolute top-[38%] left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shadow-xl hover:bg-foreground/90 transition z-20"
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Smart Insights
            </button>

            {/* Floating pill: Verified Properties (mid-right) */}
            <button
              onClick={() => navigate("/search?verified=1")}
              className="absolute top-[38%] right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shadow-xl hover:bg-foreground/90 transition z-20"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Properties
            </button>

            {/* Center X logo badge */}
            <div className="absolute top-[44%] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-foreground flex items-center justify-center shadow-2xl ring-4 ring-primary/30 z-20">
              <span className="text-primary font-black text-2xl">X</span>
            </div>

            {/* REAL search widget (center-bottom) */}
            {showSearchBar && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[14%] w-[94%] max-w-2xl z-20">
                <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
              </div>
            )}

            {/* Book Hotel (bottom-left) */}
            <button
              onClick={() => navigate("/hotels")}
              className="absolute bottom-4 left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xl hover:bg-blue-700 transition z-20"
            >
              <Hotel className="h-3.5 w-3.5" /> Book Hotel
            </button>

            {/* Smart Financing (bottom-right) */}
            <button
              onClick={goComingSoon("Smart Financing")}
              className="absolute bottom-4 right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-xl hover:bg-purple-700 transition z-20"
            >
              <Building2 className="h-3.5 w-3.5" /> Smart Financing
            </button>
          </div>

          {/* ============ RIGHT COLUMN: actions + cards ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-10 space-y-3">
            {/* Circular action buttons (Search / Shortlist / Expert Support) */}
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {rightActions.map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.04 }}
                  onClick={a.onClick}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center ring-2 ring-primary shadow-lg">
                    <a.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{a.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 pt-1">
              {rightCards.map((c) => (
                <motion.button
                  key={c.title}
                  whileHover={{ x: -3 }}
                  onClick={c.onClick}
                  className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground leading-tight">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ============ STATS BAR ============ */}
        <div className="mt-4 rounded-2xl bg-foreground text-background px-4 py-4 shadow-2xl">
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
