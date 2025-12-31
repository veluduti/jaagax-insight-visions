import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ReelCard from "./ReelCard";
import { Loader2, Sparkles, Home, Building2, Filter, X } from "lucide-react";
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
  }, [activeIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < filteredAds.length) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex]);

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
  }, [activeIndex]);

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  const filteredAds = ads.filter(ad => !filterType || ad.ad_type === filterType);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">Loading amazing deals...</p>
        </div>
      </div>
    );
  }

  if (filteredAds.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center p-8">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No promotions found</h3>
          <p className="text-muted-foreground mb-6">Check back later for new offers!</p>
          {filterType && (
            <Button onClick={() => setFilterType(null)} variant="outline">
              Clear Filter
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Filter Toggle */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex gap-2"
            >
              <Button
                variant={!filterType ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(null)}
                className={cn(
                  "backdrop-blur-sm",
                  !filterType 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
                )}
              >
                All
              </Button>
              <Button
                variant={filterType === 'property' ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(filterType === 'property' ? null : 'property')}
                className={cn(
                  "backdrop-blur-sm",
                  filterType === 'property' 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
                )}
              >
                <Home className="h-4 w-4 mr-1" />
                Properties
              </Button>
              <Button
                variant={filterType === 'project' ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(filterType === 'project' ? null : 'project')}
                className={cn(
                  "backdrop-blur-sm",
                  filterType === 'project' 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
                )}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Projects
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        {filteredAds.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              i === activeIndex 
                ? "bg-white scale-125" 
                : "bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
        {filteredAds.length > 10 && (
          <span className="text-white/60 text-xs text-center">+{filteredAds.length - 10}</span>
        )}
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-4 z-20">
        <Badge variant="secondary" className="bg-black/40 backdrop-blur-sm text-white border-0">
          {activeIndex + 1} / {filteredAds.length}
        </Badge>
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
        {activeIndex === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
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
    </div>
  );
};

export default ReelsFeed;
