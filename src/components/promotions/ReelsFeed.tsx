import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ReelCard from "./ReelCard";
import StoryPreview from "./StoryPreview";
import { Loader2, Sparkles, Home, Building2, Filter, Flame, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  properties?: { title: string; locality: string; city: string; price: number; bhk: number; area?: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

const ReelsFeed = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [savedAds, setSavedAds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStories, setShowStories] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAds();
    fetchSavedAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select(`
          *,
          properties(title, locality, city, price, bhk, area),
          projects(name, locality, city, avg_price)
        `)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('saved_advertisements')
      .select('advertisement_id')
      .eq('user_id', user.id);

    if (data) {
      setSavedAds(data.map(s => s.advertisement_id));
    }
  };

  const filteredAds = ads.filter(ad => !filterType || ad.ad_type === filterType);

  // Track impressions when viewing
  useEffect(() => {
    if (filteredAds.length === 0) return;
    
    const currentAd = filteredAds[activeIndex];
    if (currentAd) {
      supabase.rpc('increment_ad_stat', {
        p_ad_id: currentAd.id,
        p_stat_type: 'impressions'
      }).then(undefined, console.error);
    }
  }, [activeIndex, filteredAds]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < filteredAds.length) {
      setActiveIndex(newIndex);
      // Hide stories after scrolling past first item
      if (newIndex > 0 && showStories) {
        setShowStories(false);
      }
    }
  }, [activeIndex, filteredAds.length, showStories]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, filteredAds.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredAds.length]);

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleStoryClick = (index: number) => {
    scrollToIndex(index);
    setShowStories(false);
  };

  const filterOptions = [
    { id: null, label: 'All', icon: Sparkles },
    { id: 'property', label: 'Properties', icon: Home },
    { id: 'project', label: 'Projects', icon: Building2 },
    { id: 'hot', label: 'Hot Deals', icon: Flame },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/70"
          >
            Loading amazing deals...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (filteredAds.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8"
        >
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No promotions found</h3>
          <p className="text-muted-foreground mb-6">Check back later for new offers!</p>
          {filterType && (
            <Button onClick={() => setFilterType(null)} variant="outline">
              Clear Filter
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Stories Preview */}
      <AnimatePresence>
        {showStories && activeIndex === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StoryPreview onStoryClick={handleStoryClick} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Toggle */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "backdrop-blur-sm transition-all",
            showFilters 
              ? "bg-white text-black hover:bg-white/90 hover:text-black" 
              : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              className="flex gap-2"
            >
              {filterOptions.map((option) => (
                <Button
                  key={option.id || 'all'}
                  variant={filterType === option.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType(option.id)}
                  className={cn(
                    "backdrop-blur-sm",
                    filterType === option.id 
                      ? "bg-white text-black hover:bg-white/90" 
                      : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  )}
                >
                  <option.icon className="h-4 w-4 mr-1" />
                  {option.label}
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Progress Dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        {filteredAds.slice(0, 12).map((ad, i) => (
          <motion.button
            key={i}
            onClick={() => scrollToIndex(i)}
            whileHover={{ scale: 1.3 }}
            className={cn(
              "transition-all duration-300 rounded-full",
              i === activeIndex 
                ? "w-2.5 h-6 bg-white" 
                : "w-2 h-2 bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
        {filteredAds.length > 12 && (
          <span className="text-white/60 text-[10px] text-center mt-1">
            +{filteredAds.length - 12}
          </span>
        )}
      </div>

      {/* Counter with Category */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <Badge variant="secondary" className="bg-black/40 backdrop-blur-sm text-white border-0">
          {activeIndex + 1} / {filteredAds.length}
        </Badge>
        {filteredAds[activeIndex]?.featured && (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Flame className="h-3 w-3 mr-1" />
            Hot
          </Badge>
        )}
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {filteredAds.map((ad, index) => (
          <div
            key={ad.id}
            className="h-full w-full snap-start snap-always"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ReelCard
              ad={ad}
              isActive={index === activeIndex}
              isSaved={savedAds.includes(ad.id)}
              onSave={fetchSavedAds}
              index={index}
            />
          </div>
        ))}
      </div>

      {/* Touch hint for mobile */}
      <AnimatePresence>
        {activeIndex === 0 && !showStories && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white/60 text-sm flex flex-col items-center"
            >
              <span>Swipe up</span>
              <div className="w-6 h-10 border-2 border-white/40 rounded-full mt-2 flex justify-center pt-2">
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-1.5 h-1.5 bg-white/60 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double tap hint */}
      <AnimatePresence>
        {activeIndex === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 3 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: 3, duration: 1 }}
              className="text-white/60 text-sm flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-4"
            >
              <span>Double tap to ❤️</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelsFeed;
