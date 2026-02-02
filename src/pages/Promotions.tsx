import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Grid3X3, Play, Sparkles, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReelsFeed from "@/components/promotions/ReelsFeed";
import { cn } from "@/lib/utils";

const Promotions = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
  const [stats, setStats] = useState({ total: 0, featured: 0, deals: 0 });

  useEffect(() => {
    // Mock stats since advertisements table doesn't exist
    setStats({
      total: 12,
      featured: 3,
      deals: 5
    });
  }, []);

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

// Enhanced Grid View Component with mock data
const GridView = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Mock advertisement data
  const mockAds = [
    {
      id: '1',
      title: 'Luxury Villa in Banjara Hills',
      images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400'],
      price: 25000000,
      featured: true,
      offer_text: '10% Off',
      locality: 'Banjara Hills',
      city: 'Hyderabad'
    },
    {
      id: '2',
      title: 'Modern Apartment in Gachibowli',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'],
      price: 8500000,
      featured: true,
      offer_text: null,
      locality: 'Gachibowli',
      city: 'Hyderabad'
    },
    {
      id: '3',
      title: 'Spacious 3BHK in Madhapur',
      images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'],
      price: 12000000,
      featured: false,
      offer_text: 'Special Deal',
      locality: 'Madhapur',
      city: 'Hyderabad'
    },
    {
      id: '4',
      title: 'Premium Plot in Kokapet',
      images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400'],
      price: 45000000,
      featured: true,
      offer_text: null,
      locality: 'Kokapet',
      city: 'Hyderabad'
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {mockAds.map((ad, index) => {
        const image = ad.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400';
        
        return (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer shadow-lg"
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
              <p className="text-white font-bold text-xl mb-1">{formatPrice(ad.price)}</p>
              <p className="text-white/90 text-sm font-medium line-clamp-2 mb-1">{ad.title}</p>
              <p className="text-white/70 text-xs line-clamp-1">
                {ad.locality}, {ad.city}
              </p>
            </div>

            {/* Hover overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-primary/20 flex items-center justify-center"
            >
              <Button size="sm" className="bg-white text-black hover:bg-white/90">
                View Details
              </Button>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Promotions;