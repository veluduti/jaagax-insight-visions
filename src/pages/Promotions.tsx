import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Grid3X3, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReelsFeed from "@/components/promotions/ReelsFeed";
import { cn } from "@/lib/utils";

const Promotions = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-bold text-lg"
        >
          Promotions
        </motion.h1>

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
            className="pt-16 pb-8 px-4 min-h-screen bg-background"
          >
            <GridView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Grid View Component (simplified version)
const GridView = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from('advertisements')
        .select(`
          *,
          properties(title, locality, city, price, bhk),
          projects(name, locality, city, avg_price)
        `)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .then(({ data }) => {
          setAds(data || []);
          setLoading(false);
        });
    });
  });

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {ads.map((ad, index) => {
        const image = ad.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400';
        const price = ad.properties?.price || ad.projects?.avg_price || 0;
        
        return (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer"
          >
            <img
              src={image}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {ad.featured && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                  Featured
                </span>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-bold text-lg">{formatPrice(price)}</p>
              <p className="text-white/80 text-sm line-clamp-1">{ad.title}</p>
              <p className="text-white/60 text-xs line-clamp-1">
                {ad.properties?.locality || ad.projects?.locality}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Promotions;
