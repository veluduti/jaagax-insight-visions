import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdCard from "./AdCard";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
  start_date: string | null;
  end_date: string | null;
  property_id: number | null;
  project_id: number | null;
  highlights: any;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

const AdCarousel = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedAds, setSavedAds] = useState<string[]>([]);

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
          properties(title, locality, city, price, bhk),
          projects(name, locality, city, avg_price)
        `)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('priority', { ascending: false })
        .limit(8);

      if (error) throw error;
      
      // Track impressions for loaded ads
      if (data && data.length > 0) {
        for (const ad of data) {
          supabase.rpc('increment_ad_stat', { p_ad_id: ad.id, p_stat_type: 'impressions' }).then(() => {}).catch(console.error);
        }
      }
      
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

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.ceil(ads.length / 3));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.ceil(ads.length / 3)) % Math.ceil(ads.length / 3));
  };

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (ads.length === 0) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (loading) {
    return (
      <div className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ads.length === 0) return null;

  const displayAds = ads.slice(currentIndex * 3, currentIndex * 3 + 3);

  return (
    <section className="py-12 bg-gradient-to-b from-background via-primary/5 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Promoted Listings</h2>
              <p className="text-sm text-muted-foreground">Special offers from verified builders</p>
            </div>
          </div>
          
          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevSlide}
              disabled={ads.length <= 3}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextSlide}
              disabled={ads.length <= 3}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayAds.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                isSaved={savedAds.includes(ad.id)}
                onSave={fetchSavedAds}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Pagination Dots */}
        {ads.length > 3 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: Math.ceil(ads.length / 3) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdCarousel;