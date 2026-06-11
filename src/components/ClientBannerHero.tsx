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
import skylineImg from "@/assets/hero-skyline.jpg";

interface Props {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showSearchBar?: boolean;
}

const ClientBannerHero = ({ activeTab = "buy", onTabChange = () => {}, showSearchBar = false }: Props) => {
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
    { icon: Activity, label: "Project delay worry", action: () => navigate("/ai-advisor") },
    { icon: ShieldCheck, label: "Job insecurity", action: () => navigate("/ai-advisor") },
    { icon: Search, label: "Just exploring", action: () => navigate("/search") },
  ];

  // Category items
  const categories = [
    { label: "Properties", onClick: () => navigate("/properties") },
    { label: "New Projects", onClick: () => navigate("/new-projects") },
    { label: "Agents", onClick: () => navigate("/agents") },
  ];

  return (
    <section className="relative w-full bg-background overflow-hidden">
      {/* Background Image Container */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skylineImg})` }} />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-8 lg:pt-8 lg:pb-12">
        {/* Main grid layout - Desktop optimized */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6 min-h-[580px] lg:min-h-[620px]">
          {/* ============ LEFT COLUMN (4 cols on desktop) ============ */}
          <div className="col-span-12 lg:col-span-4 relative z-20">
            <h1 className="font-serif leading-[1.02] tracking-tight text-white text-4xl md:text-5xl lg:text-5xl xl:text-6xl">
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
                  whileHover={{ x: 5 }}
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
                whileHover={{ x: 5 }}
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

          {/* ============ CENTER COLUMN (5 cols on desktop) ============ */}
          <div className="col-span-12 lg:col-span-5 relative min-h-[500px] lg:min-h-[580px]">
            {/* New Property Posted Banner - Top Center */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-sm flex items-center gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-2xl hover:shadow-glow transition z-20"
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

            {/* Category Chips - Properties, New Projects, Agents */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={cat.onClick}
                  className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition"
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Buy/Rent Tabs */}
            <div className="absolute top-36 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              <button
                onClick={() => navigate("/buy")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === "buy"
                    ? "bg-primary text-white"
                    : "bg-white/20 backdrop-blur text-white hover:bg-white/30"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => navigate("/rent")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === "rent"
                    ? "bg-primary text-white"
                    : "bg-white/20 backdrop-blur text-white hover:bg-white/30"
                }`}
              >
                Rent
              </button>
            </div>

            {/* Location Input + Search */}
            <div className="absolute top-48 left-1/2 -translate-x-1/2 w-full max-w-md z-20">
              <div className="flex gap-2 bg-white/95 backdrop-blur rounded-full p-1 shadow-lg">
                <div className="flex-1 flex items-center gap-2 px-4">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter location"
                    className="flex-1 py-2 outline-none bg-transparent text-gray-700 text-sm"
                    defaultValue="Hyderabad"
                  />
                </div>
                <button
                  onClick={() => navigate("/search")}
                  className="px-5 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition"
                >
                  Search
                </button>
              </div>
              <button className="text-white/80 text-xs mt-2 ml-4 hover:text-white transition">+ More Filters</button>
            </div>

            {/* Try AI Advisor Button */}
            <button
              onClick={() => navigate("/ai-advisor")}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-xl hover:bg-primary/90 transition flex items-center gap-2 z-20 whitespace-nowrap"
            >
              <Brain className="h-4 w-4" /> Try AI Advisor
            </button>

            {/* Bottom Left: Book Hotel */}
            <button
              onClick={() => navigate("/hotels")}
              className="absolute bottom-4 left-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xl hover:bg-blue-700 transition z-20"
            >
              <Hotel className="h-3.5 w-3.5" /> Book Hotel
            </button>

            {/* Bottom Right: Smart Financing */}
            <button
              onClick={goComingSoon("Smart Financing")}
              className="absolute bottom-4 right-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-xl hover:bg-purple-700 transition z-20"
            >
              <Building2 className="h-3.5 w-3.5" /> Smart Financing
            </button>
          </div>

          {/* ============ RIGHT COLUMN (3 cols on desktop) ============ */}
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
        <div className="mt-6 rounded-2xl bg-white/95 backdrop-blur px-4 py-4 shadow-2xl">
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
