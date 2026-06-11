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
}

const ClientBannerHero = ({ activeTab = "buy", onTabChange = () => {} }: Props) => {
  const navigate = useNavigate();

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  return (
    <section className="relative w-full bg-background overflow-hidden min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skylineImg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8">
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - 4 cols */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Card 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">AI-Powered Insights</div>
                <div className="text-[11px] text-white/70">Smart recommendations just for you.</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">100% Verified Properties</div>
                <div className="text-[11px] text-white/70">Ensuring trust and transparency.</div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <IndianRupee className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Zero Hidden Costs</div>
                <div className="text-[11px] text-white/70">What you see is what you get.</div>
              </div>
            </div>

            {/* India's most trusted - plain text block */}
            <div className="p-3">
              <div className="text-sm font-bold text-white">India's most trusted</div>
              <div className="text-[11px] text-white/70">intelligent property platform</div>
            </div>
          </div>

          {/* CENTER COLUMN - 5 cols */}
          <div className="col-span-12 lg:col-span-5">
            {/* Title */}
            <div className="text-center">
              <h1 className="font-serif leading-[1.1] text-white text-4xl md:text-5xl lg:text-5xl">
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
            <div className="w-full mt-5 flex items-center gap-3 p-3 rounded-xl bg-white/95 border border-gray-200 shadow-xl">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900">New Property Posted!</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <span className="text-[10px] font-medium text-white bg-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    Property Live <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Pills */}
            <div className="flex justify-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-gray-900 text-[11px] font-semibold shadow-md">
                <TrendingUp className="h-3 w-3 text-primary" /> Smart Insights
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-gray-900 text-[11px] font-semibold shadow-md">
                <ShieldCheck className="h-3 w-3 text-primary" /> Verified Properties
              </div>
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
              <button className="px-4 py-1.5 bg-primary text-white rounded-full text-[11px] font-medium flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </button>
            </div>
            <button className="text-white/70 text-[10px] mt-1.5 ml-4">+ More Filters</button>

            {/* Bottom Buttons */}
            <div className="flex justify-center gap-3 mt-4">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold shadow-md">
                <Hotel className="h-3 w-3" /> Book Hotel
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-[10px] font-semibold shadow-md">
                <Building2 className="h-3 w-3" /> Smart Financing
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - 3 cols */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Circular Buttons Row */}
            <div className="flex gap-6">
              {/* Shortlist */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary/50 shadow-md">
                  <Heart className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-white">Shortlist</span>
              </div>
              {/* Expert Support */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary/50 shadow-md">
                  <Headphones className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-white">Expert Support</span>
              </div>
            </div>

            {/* Smart Financing Card */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Smart Financing</div>
                <div className="text-[11px] text-white/70">Pre-Approved Up to ₹5 Cr</div>
              </div>
            </div>

            {/* Instant Match Card */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Instant Match</div>
                <div className="text-[11px] text-white/70">Connect with right buyers & sellers</div>
              </div>
            </div>

            {/* Real-time Updates Card */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Real-time Updates</div>
                <div className="text-[11px] text-white/70">on new properties</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM STATS BAR */}
        <div className="mt-8 rounded-xl bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 50K+ Verified Properties */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">50K+</div>
                <div className="text-[10px] text-gray-600">Verified Properties</div>
              </div>
            </div>
            {/* 100K+ Happy Customers */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">100K+</div>
                <div className="text-[10px] text-gray-600">Happy Customers</div>
              </div>
            </div>
            {/* AI Powered Smart Insights */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">AI Powered</div>
                <div className="text-[10px] text-gray-600">Smart Insights</div>
              </div>
            </div>
            {/* 100% Secure & Transparent */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">100%</div>
                <div className="text-[10px] text-gray-600">Secure & Transparent</div>
              </div>
            </div>
            {/* 24/7 Expert Support */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">24/7</div>
                <div className="text-[10px] text-gray-600">Expert Support</div>
              </div>
            </div>
            {/* 4.8/5 User Rating */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">4.8/5</div>
                <div className="text-[10px] text-gray-600">User Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientBannerHero;
