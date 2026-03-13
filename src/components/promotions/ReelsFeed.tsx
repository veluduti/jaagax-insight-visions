import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Sparkles, Construction, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReelCard from "./ReelCard";

interface Advertisement {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  images: string[];
  offer_text: string | null;
  cta_text: string | null;
  ad_type: string;
  featured: boolean;
  impressions: number;
  saves: number;
  highlights: any;
  property_id: string | null;
  project_id: string | null;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number; area?: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

const ReelsFeed = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedAds, setSavedAds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("advertisements")
      .select(`
        id, title, tagline, description, images, offer_text, cta_text, 
        ad_type, featured, impressions, saves, highlights, property_id, project_id,
        properties(title, locality, city, price, bhk, area),
        projects(name, locality, city, avg_price)
      `)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .order("featured", { ascending: false });

    if (!error && data) {
      setAds(
        data.map((ad: any) => ({
          ...ad,
          images: (ad.images as string[]) || [],
          featured: ad.featured ?? false,
          impressions: ad.impressions ?? 0,
          saves: ad.saves ?? 0,
        }))
      );
    }
    setLoading(false);
  };

  const trackImpression = useCallback(async (adId: string) => {
    await supabase.from("ad_interactions").insert({
      ad_id: adId,
      interaction_type: "impression",
    });
  }, []);

  useEffect(() => {
    if (ads.length > 0 && ads[currentIndex]) {
      trackImpression(ads[currentIndex].id);
    }
  }, [currentIndex, ads, trackImpression]);

  const handleSave = useCallback(async (adId: string) => {
    setSavedAds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) {
        next.delete(adId);
        toast("Removed from saved");
      } else {
        next.add(adId);
        toast.success("Saved to your collection!");
      }
      return next;
    });
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < ads.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, ads.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.y < -threshold) goToNext();
      else if (info.offset.y > threshold) goToPrev();
    },
    [goToNext, goToPrev]
  );

  const handleNavigateToDetail = useCallback(
    (ad: Advertisement) => {
      // Track click
      supabase.from("ad_interactions").insert({
        ad_id: ad.id,
        interaction_type: "click",
      });

      if (ad.property_id) {
        navigate(`/property/${ad.property_id}`);
      } else if (ad.project_id) {
        navigate(`/project/${ad.project_id}`);
      } else {
        toast.info("Details page coming soon!");
      }
    },
    [navigate]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goToNext();
      if (e.key === "ArrowUp" || e.key === "k") goToPrev();
      if (e.key === "Enter") {
        if (ads[currentIndex]) handleNavigateToDetail(ads[currentIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goToNext, goToPrev, currentIndex, ads, handleNavigateToDetail]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center p-8">
          <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Promotions Coming Soon</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            The TikTok-style promotions feed is being set up. Check back soon to
            discover amazing property deals!
          </p>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">
              Featuring AI-matched recommendations
            </span>
          </div>
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.95,
    }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({
      y: dir > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-black touch-none select-none"
    >
      {/* Progress indicators */}
      <div className="absolute top-14 left-0 right-0 z-20 flex gap-1 px-4">
        {ads.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/20">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: i === currentIndex ? "100%" : i < currentIndex ? "100%" : "0%" }}
              transition={{ duration: i === currentIndex ? 5 : 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* Navigation hints */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 z-20 flex flex-col items-center gap-1 opacity-40">
        {currentIndex > 0 && (
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronUp className="h-5 w-5 text-white" />
          </motion.div>
        )}
      </div>

      {currentIndex < ads.length - 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 flex flex-col items-center gap-1 opacity-40">
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="h-5 w-5 text-white" />
          </motion.div>
        </div>
      )}

      {/* Reel cards */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          <ReelCard
            ad={ads[currentIndex]}
            isActive={true}
            isSaved={savedAds.has(ads[currentIndex].id)}
            onSave={() => handleSave(ads[currentIndex].id)}
            onNavigate={() => handleNavigateToDetail(ads[currentIndex])}
            index={currentIndex}
          />
        </motion.div>
      </AnimatePresence>

      {/* Tap zones for navigation */}
      <div
        className="absolute top-0 left-0 right-0 h-1/4 z-10 cursor-pointer"
        onClick={goToPrev}
      />
      <div
        className="absolute bottom-24 left-0 right-0 h-1/4 z-10 cursor-pointer"
        onClick={goToNext}
      />
    </div>
  );
};

export default ReelsFeed;
