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
  AlertTriangle,
  Clock,
  MapPin,
} from "lucide-react";
import PropertySearchBar from "./PropertySearchBar";
import skylineImg from "@/assets/hero-skyline.jpg";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSearchBar?: boolean;
}

const ClientBannerHero = ({ activeTab, onTabChange, showSearchBar = true }: Props) => {
  const navigate = useNavigate();

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  // Features for the left column
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
  ];

  // Right side action buttons
  const rightActions = [
    { icon: Search, label: "Search", onClick: () => navigate("/search") },
    { icon: Heart, label: "Shortlist", onClick: () => navigate("/dashboard/buyer") },
    { icon: Headphones, label: "Expert Support", onClick: goComingSoon("Expert Support") },
  ];

  // Right side cards
  const rightCards = [
    {
      icon: Wallet,
      title: "Smart Financing",
      desc: "Pre-Approved Up to ₹5 Cr",
      onClick: goComingSoon("Smart Financing"),
    },
    {
      icon: Users,
      title: "Instant Match",
      desc: "Connect with right buyers & sellers",
      onClick: () => navigate("/ai-advisor"),
    },
    {
      icon: Activity,
      title: "Real-time Updates",
      desc: "on new properties",
      onClick: goComingSoon("Real-time Updates"),
    },
  ];

  // Stats for the bottom bar
  const stats = [
    { icon: ShieldCheck, value: "50K+", label: "Verified Properties" },
    { icon: Users, value: "100K+", label: "Happy Customers" },
    { icon: TrendingUp, value: "AI Powered", label: "Smart Insights" },
    { icon: Lock, value: "100%", label: "Secure & Transparent" },
    { icon: Headphones, value: "24/7", label: "Expert Support" },
    { icon: Star, value: "4.8/5", label: "User Rating" },
  ];

  // What's on mind items
  const mindItems = [
    { icon: TrendingUp, label: "Price may fall", action: () => navigate("/ai-advisor") },
    { icon: Clock, label: "Project delay worry", action: () => navigate("/ai-advisor") },
    { icon: AlertTriangle, label: "Job insecurity", action: () => navigate("/ai-advisor") },
    { icon: Search, label: "Just exploring", action: () => navigate("/search") },
  ];

  return (
    <section className="relative w-full bg-background overflow-hidden">
      {/* Background Image Container */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skylineImg})` }} />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-3 md:px-4 pt-4 pb-4 lg:pt-6">
        {/* Main 12-col canvas */}
        <div className="relative grid grid-cols-12 gap-3 lg:gap-4 min-h-[560px] lg:min-h-[640px]">
          {/* ============ LEFT TEXT COLUMN ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-20 rounded-2xl p-4 lg:p-2">
            <h1 className="font-serif leading-[1.02] tracking-tight text-white text-4xl md:text-5xl lg:text-[3.1rem]">
              Your Dream
              <br />
              <span className="text-primary">Place Awaits</span>
            </h1>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-white/80">
              <span>FIND</span>
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span>CONNECT</span>
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span>GROW</span>
            </div>

            <div className="mt-5 space-y-2.5">
              {features.map((f) => (
                <motion.button
                  key={f.title}
                  whileHover={{ x: 3 }}
                  onClick={f.onClick}
                  className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{f.title}</div>
                    <div className="text-xs text-white/70 mt-0.5">{f.desc}</div>
                  </div>
                </motion.button>
              ))}

              {/* India's most trusted section */}
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => navigate("/trust-score")}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-bold text-white leading-tight">
                  India's most trusted
                  <div className="font-medium text-white/70 text-xs mt-0.5">intelligent property platform</div>
                </div>
              </motion.button>
            </div>
          </div>

          {/* ============ CENTER SECTION ============ */}
          <div className="col-span-12 lg:col-span-6 relative min-h-[460px] lg:min-h-[640px]">
            {/* New Property Posted Banner - Top Center */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-[88%] max-w-sm flex items-center gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-2xl hover:shadow-glow transition z-20"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-gray-900">New Property Posted!</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-primary px-2 py-0.5 rounded-full">
                    Property Live <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Floating Pill: Smart Insights - Left */}
            <button
              onClick={() => navigate("/ai-advisor")}
              className="absolute top-[38%] left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 text-gray-900 text-xs font-semibold shadow-xl hover:bg-white transition z-20"
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Smart Insights
            </button>

            {/* Floating Pill: Verified Properties - Right */}
            <button
              onClick={() => navigate("/search?verified=1")}
              className="absolute top-[38%] right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 text-gray-900 text-xs font-semibold shadow-xl hover:bg-white transition z-20"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Properties
            </button>

            {/* Center Logo Badge */}
            <div className="absolute top-[44%] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl ring-4 ring-primary/30 z-20">
              <span className="text-primary font-black text-2xl">X</span>
            </div>

            {/* Search Widget - Center Bottom */}
            {showSearchBar && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[20%] w-[94%] max-w-2xl z-20">
                <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
              </div>
            )}

            {/* Bottom Left: Book Hotel */}
            <button
              onClick={() => navigate("/hotels")}
              className="absolute bottom-4 left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xl hover:bg-blue-700 transition z-20"
            >
              <Hotel className="h-3.5 w-3.5" /> Book Hotel
            </button>

            {/* Bottom Right: Smart Financing */}
            <button
              onClick={goComingSoon("Smart Financing")}
              className="absolute bottom-4 right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-xl hover:bg-purple-700 transition z-20"
            >
              <Building2 className="h-3.5 w-3.5" /> Smart Financing
            </button>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-20 space-y-3">
            {/* Circular action buttons */}
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {rightActions.map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.04 }}
                  onClick={a.onClick}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-primary shadow-lg hover:bg-white/30 transition">
                    <a.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white">{a.label}</span>
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
                  className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{c.title}</div>
                    <div className="text-xs text-white/70 mt-0.5">{c.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ============ STATS BAR ============ */}
        <div className="mt-4 rounded-2xl bg-white/95 backdrop-blur px-4 py-4 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm md:text-base font-bold text-gray-900 leading-tight">{s.value}</div>
                  <div className="text-[11px] text-gray-600 leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============ "What's on your mind?" Section ============ */}
        <div className="mt-4 p-4 rounded-2xl bg-white/95 backdrop-blur border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-gray-900">What's on your mind?</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mindItems.map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                onClick={item.action}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-primary/10 transition text-xs font-medium text-gray-700"
              >
                <item.icon className="h-3 w-3 text-primary" />
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientBannerHero;
