import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  MapPin,
  Home,
  Key,
  Building,
  Store,
  ChevronDown,
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

// Slide data for carousel - Now includes BOTH banner designs
interface SlideData {
  id: number;
  type: "original" | "new";
  mainTitle: string;
  subTitle: string;
  tagline: string;
  description: string;
  buttonText: string;
  buttonAction: () => void;
  backgroundImage?: string;
  gradient?: string;
  // New banner specific fields
  showFeatures?: boolean;
  showStats?: boolean;
  showRightCards?: boolean;
}

const ClientBannerHero = ({ activeTab, onTabChange, showSearchBar = true }: Props) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  // Carousel slides - Mix of original and new banner designs
  const slides: SlideData[] = [
    {
      id: 0,
      type: "original",
      mainTitle: "Your Dream",
      subTitle: "Place Awaits",
      tagline: "FIND · CONNECT · GROW",
      description: "AI-Powered Insights • 100% Verified Properties • Zero Hidden Costs",
      buttonText: "Explore Properties",
      buttonAction: () => navigate("/search"),
      backgroundImage: skylineImg,
    },
    {
      id: 1,
      type: "new",
      mainTitle: "India's First AI-Powered",
      subTitle: "Real Estate Platform",
      tagline: "Properties • New Projects • Agents",
      description: "AI-Powered Insights • Verified Properties • Zero Hidden Costs",
      buttonText: "Try AI Advisor",
      buttonAction: () => navigate("/ai-advisor"),
      backgroundImage: villaImg,
      showFeatures: true,
      showStats: true,
      showRightCards: true,
    },
    {
      id: 2,
      type: "original",
      mainTitle: "Smart Financing",
      subTitle: "Up to ₹5 Cr Pre-Approved",
      tagline: "Instant Match • Real-time Updates",
      description: "Connect with right buyers & sellers • Zero Hidden Costs",
      buttonText: "Get Pre-Approved",
      buttonAction: goComingSoon("Smart Financing"),
      backgroundImage: hotelImg,
    },
    {
      id: 3,
      type: "new",
      mainTitle: "Your Dream",
      subTitle: "Place Awaits",
      tagline: "FIND · CONNECT · GROW",
      description: "AI-Powered Insights • 100% Verified Properties • Zero Hidden Costs",
      buttonText: "Explore Now",
      buttonAction: () => navigate("/search"),
      backgroundImage: familyImg,
      showFeatures: true,
      showStats: true,
      showRightCards: true,
    },
  ];

  // Original features (left column)
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

  // New banner features (grid layout)
  const newBannerFeatures = [
    { icon: Brain, title: "AI-Powered Insights", desc: "Smart recommendations just for you." },
    { icon: ShieldCheck, title: "100% Verified Properties", desc: "Ensuring trust and transparency." },
    { icon: IndianRupee, title: "Zero Hidden Costs", desc: "What you see is what you get." },
  ];

  const rightActions = [
    { icon: Search, label: "Search", onClick: () => navigate("/search") },
    { icon: Heart, label: "Shortlist", onClick: () => navigate("/dashboard/buyer") },
    { icon: Headphones, label: "Expert Support", onClick: goComingSoon("Expert Support") },
  ];

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

  const stats = [
    { icon: ShieldCheck, value: "50K+", label: "Verified Properties" },
    { icon: Users, value: "100K+", label: "Happy Customers" },
    { icon: TrendingUp, value: "AI Powered", label: "Smart Insights" },
    { icon: Lock, value: "100%", label: "Secure & Transparent" },
    { icon: Headphones, value: "24/7", label: "Expert Support" },
    { icon: Star, value: "4.8/5", label: "User Rating" },
  ];

  // New banner stats (simplified)
  const newBannerStats = [
    { value: "50K+", label: "Verified Properties" },
    { value: "2.5L Cr", label: "Property Value" },
    { value: "100%", label: "Trust Score" },
    { value: "AI", label: "Powered Insights" },
  ];

  // Carousel navigation
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(true);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(true);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(true);
  };

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [nextSlide, isAutoPlaying]);

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  const currentSlideData = slides[currentSlide];
  const isNewBanner = currentSlideData.type === "new";

  return (
    <section className="relative w-full bg-background overflow-hidden">
      <div className="container mx-auto px-3 md:px-4 pt-4 pb-4 lg:pt-6">
        {/* Main 12-col canvas */}
        <div className="relative grid grid-cols-12 gap-3 lg:gap-4 min-h-[560px] lg:min-h-[640px]">
          {/* ============ LEFT TEXT COLUMN (Changes based on banner type) ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-20 bg-card lg:bg-transparent rounded-2xl p-4 lg:p-2">
            {!isNewBanner ? (
              // Original Left Column Content
              <>
                <h1 className="font-serif leading-[1.02] tracking-tight text-4xl md:text-5xl lg:text-[3.1rem]">
                  <span className="text-foreground">Your Dream</span>
                  <br />
                  <span className="text-primary">Place Awaits</span>
                </h1>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-foreground/80">
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
                      <div className="font-medium text-muted-foreground text-xs mt-0.5">
                        intelligent property platform
                      </div>
                    </div>
                  </motion.button>
                </div>
              </>
            ) : (
              // New Banner Left Column Content (from second image)
              <div className="text-white">
                <h1 className="font-serif leading-[1.02] tracking-tight text-4xl md:text-5xl lg:text-[3.1rem]">
                  <span className="text-white">Your Dream</span>
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
                  {newBannerFeatures.map((f) => (
                    <motion.button
                      key={f.title}
                      whileHover={{ x: 3 }}
                      onClick={() => navigate(f.title === "AI-Powered Insights" ? "/ai-advisor" : "/search")}
                      className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white leading-tight">{f.title}</div>
                        <div className="text-xs text-white/70 mt-0.5">{f.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============ CENTER CAROUSEL SECTION ============ */}
          <div
            className="col-span-12 lg:col-span-6 relative min-h-[460px] lg:min-h-[640px] rounded-2xl overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {/* Background Image with Overlay */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentSlideData.backgroundImage})` }}
                />
                <div
                  className={`absolute inset-0 ${isNewBanner ? "bg-gradient-to-br from-black/70 via-black/50 to-black/60" : "bg-gradient-to-br from-black/60 via-black/40 to-black/50"}`}
                />

                {/* Decorative Elements */}
                <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />

                {/* Slide Content - Different layout for new banner */}
                <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-10 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-full"
                  >
                    {!isNewBanner ? (
                      // Original slide content
                      <>
                        <div className="text-sm font-bold tracking-[0.3em] text-primary/90 mb-3">
                          {currentSlideData.tagline}
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                          {currentSlideData.mainTitle}
                          <br />
                          <span className="text-primary">{currentSlideData.subTitle}</span>
                        </h2>
                        <p className="mt-3 text-sm md:text-base text-white/80 max-w-md">
                          {currentSlideData.description}
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={currentSlideData.buttonAction}
                          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition shadow-lg"
                        >
                          {currentSlideData.buttonText}
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      </>
                    ) : (
                      // New banner content with stats and cards
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-bold tracking-[0.3em] text-primary/90 mb-3">
                            {currentSlideData.tagline}
                          </div>
                          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                            {currentSlideData.mainTitle}
                            <br />
                            <span className="text-primary">{currentSlideData.subTitle}</span>
                          </h2>
                          <p className="mt-3 text-sm md:text-base text-white/80">{currentSlideData.description}</p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={currentSlideData.buttonAction}
                            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition shadow-lg"
                          >
                            {currentSlideData.buttonText}
                            <ArrowRight className="h-4 w-4" />
                          </motion.button>
                        </div>
                        <div className="space-y-2">
                          {rightCards.map((card, idx) => (
                            <motion.button
                              key={idx}
                              whileHover={{ x: 5 }}
                              onClick={card.onClick}
                              className="w-full text-left flex items-start gap-3 p-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
                            >
                              <card.icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-bold text-xs text-white">{card.title}</div>
                                <div className="text-[10px] text-white/70">{card.desc}</div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition z-20"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition z-20"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? "w-8 bg-primary" : "w-2 bg-white/60 hover:bg-white/80"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Floating Elements */}
            <button
              onClick={() => navigate("/ai-advisor")}
              className="absolute top-[15%] left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shadow-xl hover:bg-foreground/90 transition z-20"
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Smart Insights
            </button>

            <button
              onClick={() => navigate("/search?verified=1")}
              className="absolute top-[15%] right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shadow-xl hover:bg-foreground/90 transition z-20"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Properties
            </button>

            {/* New Property Posted Banner */}
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

            {/* Search Widget */}
            {showSearchBar && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[20%] w-[94%] max-w-2xl z-20">
                <PropertySearchBar activeTab={activeTab} onTabChange={onTabChange} />
              </div>
            )}

            {/* Bottom Action Buttons */}
            <button
              onClick={() => navigate("/hotels")}
              className="absolute bottom-4 left-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xl hover:bg-blue-700 transition z-20"
            >
              <Hotel className="h-3.5 w-3.5" /> Book Hotel
            </button>

            <button
              onClick={goComingSoon("Smart Financing")}
              className="absolute bottom-4 right-[6%] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-xl hover:bg-purple-700 transition z-20"
            >
              <Building2 className="h-3.5 w-3.5" /> Smart Financing
            </button>

            {/* Slide Counter */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur rounded-full px-3 py-1 text-xs text-white z-20">
              {currentSlide + 1} / {slides.length}
            </div>
          </div>

          {/* ============ RIGHT COLUMN (Changes based on banner type) ============ */}
          <div className="col-span-12 lg:col-span-3 relative z-20 space-y-3">
            {!isNewBanner ? (
              // Original Right Column
              <>
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
              </>
            ) : (
              // New Banner Right Column (simplified for new design)
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {rightActions.slice(0, 3).map((a) => (
                    <motion.button
                      key={a.label}
                      whileHover={{ scale: 1.04 }}
                      onClick={a.onClick}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <a.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[10px] font-medium text-white">{a.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ STATS BAR (Changes based on banner type) ============ */}
        <div className="mt-4 rounded-2xl bg-foreground text-background px-4 py-4 shadow-2xl">
          <div
            className={`grid ${isNewBanner ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"} gap-4`}
          >
            {(isNewBanner ? newBannerStats : stats).map((s, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {!isNewBanner && s.icon && (
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm md:text-base font-bold leading-tight">{s.value}</div>
                  <div className="text-[11px] text-background/70 leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============ "What's on your mind?" Section ============ */}
        <div className="mt-4 p-4 rounded-2xl bg-card border border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">What's on your mind?</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: TrendingUp, label: "Price may fall", action: () => navigate("/ai-advisor") },
              { icon: Clock, label: "Project delay worry", action: () => navigate("/ai-advisor") },
              { icon: AlertTriangle, label: "Job insecurity", action: () => navigate("/ai-advisor") },
              { icon: Search, label: "Just exploring", action: () => navigate("/search") },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                onClick={item.action}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 transition text-xs font-medium text-foreground"
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
