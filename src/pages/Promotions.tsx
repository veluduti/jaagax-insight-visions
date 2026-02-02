import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Grid3X3, Play, Sparkles, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReelsFeed from "@/components/promotions/ReelsFeed";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Advertisement {
  id: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  images: string[];
  highlights: string[];
  offer_text?: string | null;
  cta_text?: string | null;
  featured: boolean | null;
  priority: number | null;
  impressions: number | null;
  clicks: number | null;
  saves: number | null;
  contacts: number | null;
  property_id?: string | null;
  project_id?: string | null;
  ad_type: string;
}

const Promotions = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
  const [stats, setStats] = useState({ total: 0, featured: 0, deals: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('advertisements')
      .select('id, featured, offer_text')
      .eq('status', 'active');

    if (!error && data) {
      setStats({
        total: data.length,
        featured: data.filter(ad => ad.featured).length,
        deals: data.filter(ad => ad.offer_text).length
      });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-white font-bold text-lg">Promotions</h1>
        </motion.div>

        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('reels')}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              viewMode === 'reels' 
                ? "bg-white text-black hover:bg-white hover:text-black" 
                : "text-white hover:bg-white/20 hover:text-white"
            )}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              viewMode === 'grid' 
                ? "bg-white text-black hover:bg-white hover:text-black" 
                : "text-white hover:bg-white/20 hover:text-white"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar (for grid view) */}
      {viewMode === 'grid' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-20 px-4 py-3 bg-background/95 backdrop-blur-sm border-b"
        >
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {stats.total} Active
            </Badge>
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 gap-1">
              <Flame className="h-3 w-3" />
              {stats.featured} Featured
            </Badge>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.deals} Deals
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'reels' ? (
          <motion.div
            key="reels"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <ReelsFeed />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-28 pb-8 px-4 min-h-screen bg-background"
          >
            <GridView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Grid View Component with real data
const GridView = () => {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('featured', { ascending: false });

    if (!error && data) {
      setAds(data.map(ad => ({
        ...ad,
        images: (ad.images as string[]) || [],
        highlights: (ad.highlights as string[]) || []
      })));
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const trackImpression = async (adId: string) => {
    await supabase.from('ad_interactions').insert({
      ad_id: adId,
      interaction_type: 'impression'
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Active Promotions</h3>
        <p className="text-muted-foreground">Check back soon for new deals and offers!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {ads.map((ad, index) => {
        const image = ad.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400';
        
        return (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            onViewportEnter={() => trackImpression(ad.id)}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer shadow-lg"
            onClick={() => {
              if (ad.property_id) navigate(`/property/${ad.property_id}`);
              else if (ad.project_id) navigate(`/project/${ad.project_id}`);
            }}
          >
            <img
              src={image}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            
            {ad.featured && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-lg">
                  <Flame className="h-3 w-3" />
                  Featured
                </Badge>
              </div>
            )}

            {ad.offer_text && (
              <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="bg-gradient-to-r from-rose-500 to-pink-500 border-0 shadow-lg">
                  {ad.offer_text}
                </Badge>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold text-lg mb-1">{ad.title}</p>
              {ad.tagline && (
                <p className="text-white/80 text-sm line-clamp-1">{ad.tagline}</p>
              )}
            </div>

            {/* Hover overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-primary/20 flex items-center justify-center"
            >
              <Button size="sm" className="bg-white text-black hover:bg-white/90">
                {ad.cta_text || 'View Details'}
              </Button>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Promotions;
