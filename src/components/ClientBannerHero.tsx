import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  IndianRupee,
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
  MapPin,
} from "lucide-react";
import skylineImg from "@/assets/hero-skyline.jpg";

interface Props {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showSearchBar?: boolean;
}

const ClientBannerHero = ({
  activeTab = "buy",
  onTabChange = () => {},
  showSearchBar: _showSearchBar = true,
}: Props) => {
  const navigate = useNavigate();

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  // Left column features
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

  // Right column circular buttons
  const rightActions = [
    { icon: Heart, label: "Shortlist", onClick: () => navigate("/dashboard/buyer") },
    { icon: Headphones, label: "Expert Support", onClick: goComingSoon("Expert Support") },
  ];

  // Right column cards
  const rightCards = [
    {
      icon: Wallet,
      title: "Smart Financing",
      descLine1: "Pre-Approved",
      descLine2: "Up to ₹5 Cr",
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

  // Bottom stats
  const stats = [
    { icon: ShieldCheck, value: "50K+", label: "Verified Properties" },
    { icon: Users, value: "100K+", label: "Happy Customers" },
    { icon: TrendingUp, value: "AI Powered", label: "Smart Insights" },
    { icon: Lock, value: "100%", label: "Secure & Transparent" },
    { icon: Headphones, value: "24/7", label: "Expert Support" },
    { icon: Star, value: "4.8/5", label: "User Rating" },
  ];

  return (
    <section className="relative w-full bg-background overflow-hidden min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skylineImg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8">
        {/* Main Grid - 12 columns */}
        <div className="grid grid-cols-12 gap-5 lg:gap-6">
          {/* ============ LEFT COLUMN (4 cols) ============ */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            {/* 3 Feature Cards */}
            {features.map((f) => (
              <motion.button
                key={f.title}
                whileHover={{ x: 5 }}
                onClick={f.onClick}
                className="group w-full text-left flex items-start gap-3 p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                  <f.icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">{f.title}</div>
                  <div className="text-[11px] text-white/70 mt-0.5">{f.desc}</div>
                </div>
              </motion.button>
            ))}

            {/* India's most trusted platform - plain text WITHOUT icon as shown in image */}
            <div className="px-3 py-2">
              <div className="text-sm font-bold text-white leading-tight">India's most trusted</div>
              <div className="text-[11px] text-white/70 mt-0.5">intelligent property platform</div>
            </div>
          </div>

          {/* ============ CENTER COLUMN (5 cols) ============ */}
          <div className="col-span-12 lg:col-span-5">
            {/* Main Title */}
            <div className="text-center">
              <h1 className="font-serif leading-[1.1] tracking-tight text-white text-4xl md:text-5xl lg:text-5xl">
                Your Dream
                <br />
                <span className="text-primary">Place Awaits</span>
              </h1>
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.3em] text-white/80">
                <span>FIND</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span>CONNECT</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span>GROW</span>
              </div>
            </div>

            {/* New Property Posted Card */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              className="w-full mt-5 flex items-center gap-3 p-3 rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-xl hover:shadow-glow transition"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-gray-900">New Property Posted!</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white bg-primary px-2 py-0.5 rounded-full">
                    Property Live <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Smart Insights & Verified Properties Pills */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => navigate("/ai-advisor")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-gray-900 text-[11px] font-semibold shadow-md hover:bg-white transition"
              >
                <TrendingUp className="h-3 w-3 text-primary" /> Smart Insights
              </button>
              <button
                onClick={() => navigate("/search?verified=1")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-gray-900 text-[11px] font-semibold shadow-md hover:bg-white transition"
              >
                <ShieldCheck className="h-3 w-3 text-primary" /> Verified Properties
              </button>
            </div>

            {/* Logo */}
            <div className="flex justify-center my-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg ring-3 ring-primary/30">
                <span className="text-primary font-black text-xl">X</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-white/10 backdrop-blur-sm rounded-full p-1 max-w-md mx-auto">
              {["Buy", "Rent", "New Projects", "Commercial"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    const tabKey = tab.toLowerCase().replace(" ", "-");
                    onTabChange(tabKey);
                    navigate(
                      `/${tabKey === "new-projects" ? "new-projects" : tabKey === "commercial" ? "commercial" : tabKey}`,
                    );
                  }}
                  className={`flex-1 py-1.5 rounded-full text-[11px] font-medium transition ${
                    activeTab === tab.toLowerCase().replace(" ", "-")
                      ? "bg-primary text-white shadow-md"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 bg-white rounded-full p-1 shadow-lg mt-3 max-w-md mx-auto">
              <div className="flex-1 flex items-center gap-2 px-3">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter location, city or landmark"
                  className="flex-1 py-1.5 outline-none bg-transparent text-gray-700 text-xs"
                  defaultValue="Hyderabad"
                />
              </div>
              <button
                onClick={() => navigate("/search")}
                className="px-4 py-1.5 bg-primary text-white rounded-full text-[11px] font-medium hover:bg-primary/90 transition flex items-center gap-1"
              >
                <Search className="h-3 w-3" /> Search
              </button>
            </div>
            <button className="text-white/70 text-[10px] mt-1.5 ml-4 hover:text-white transition">
              + More Filters
            </button>

            {/* Bottom Buttons */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => navigate("/hotels")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold shadow-md hover:bg-blue-700 transition"
              >
                <Hotel className="h-3 w-3" /> Book Hotel
              </button>
              <button
                onClick={goComingSoon("Smart Financing")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-[10px] font-semibold shadow-md hover:bg-purple-700 transition"
              >
                <Building2 className="h-3 w-3" /> Smart Financing
              </button>
            </div>
          </div>

          {/* ============ RIGHT COLUMN (3 cols) ============ */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            {/* Circular Buttons Row */}
            <div className="flex gap-4 justify-start">
              {rightActions.map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.05 }}
                  onClick={a.onClick}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary/50 shadow-md hover:bg-white/30 transition">
                    <a.icon className="h-4.5 w-4.5 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="text-[10px] font-semibold text-white">{a.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Right Column Cards - with multi-line text for Smart Financing */}
            <div className="space-y-2.5">
              {/* Smart Financing Card - with two line description */}
              <motion.button
                whileHover={{ x: -3 }}
                onClick={rightCards[0].onClick}
                className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                  <Wallet className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Smart Financing</div>
                  <div className="text-[11px] text-white/70 mt-0.5 leading-tight">Pre-Approved</div>
                  <div className="text-[11px] text-white/70 leading-tight">Up to ₹5 Cr</div>
                </div>
              </motion.button>

              {/* Instant Match Card */}
              <motion.button
                whileHover={{ x: -3 }}
                onClick={rightCards[1].onClick}
                className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                  <Users className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Instant Match</div>
                  <div className="text-[11px] text-white/70 mt-0.5">Connect with right buyers & sellers</div>
                </div>
              </motion.button>

              {/* Real-time Updates Card */}
              <motion.button
                whileHover={{ x: -3 }}
                onClick={rightCards[2].onClick}
                className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                  <Activity className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Real-time Updates</div>
                  <div className="text-[11px] text-white/70 mt-0.5">on new properties</div>
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* ============ STATS BAR ============ */}
        <div className="mt-8 rounded-xl bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 leading-tight">{s.value}</div>
                  <div className="text-[10px] text-gray-600 leading-tight whitespace-nowrap">{s.label}</div>
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
