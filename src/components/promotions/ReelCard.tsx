import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, Bookmark, Share2, MessageCircle, MapPin, 
  Bed, Bath, Maximize, Play, Pause, Volume2, VolumeX,
  ChevronUp, Sparkles, BadgeCheck, Building2, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface ReelCardProps {
  ad: Advertisement;
  isActive: boolean;
  isSaved: boolean;
  onSave: () => void;
  index: number;
}

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString()}`;
};

const ReelCard = ({ ad, isActive, isSaved, onSave, index }: ReelCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [showDetails, setShowDetails] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const images = ad.images?.length ? ad.images : [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
  ];

  // Auto-rotate images when active
  useEffect(() => {
    if (!isActive || !isPlaying || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isActive, isPlaying, images.length]);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to save promotions");
      return;
    }

    try {
      if (saved) {
        await supabase
          .from('saved_advertisements')
          .delete()
          .eq('user_id', user.id)
          .eq('advertisement_id', ad.id);
        setSaved(false);
        toast.success("Removed from saved");
      } else {
        await supabase
          .from('saved_advertisements')
          .insert({ user_id: user.id, advertisement_id: ad.id });
        setSaved(true);
        toast.success("Saved to your collection");
      }
      onSave();
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: ad.title,
        text: ad.tagline || ad.description || '',
        url: window.location.href
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  const handleContact = () => {
    toast.success("Contact request sent! Agent will reach out soon.");
  };

  const price = ad.properties?.price || ad.projects?.avg_price || 0;
  const location = ad.properties?.locality || ad.projects?.locality || '';
  const city = ad.properties?.city || ad.projects?.city || '';

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Images with Ken Burns effect */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={images[currentImageIndex]}
            alt={ad.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

      {/* Image Progress Indicators */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 right-16 flex gap-1 z-10">
          {images.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i === currentImageIndex ? "bg-white" : "bg-white/40"
              )}
            >
              {i === currentImageIndex && isPlaying && (
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Featured Badge */}
      {ad.featured && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-12 left-4 z-10"
        >
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
            <Sparkles className="h-3 w-3" />
            Featured
          </Badge>
        </motion.div>
      )}

      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-white" />
        ) : (
          <Play className="h-4 w-4 text-white" />
        )}
      </button>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "p-3 rounded-full backdrop-blur-sm transition-colors",
            liked ? "bg-red-500" : "bg-black/40"
          )}>
            <Heart className={cn("h-6 w-6", liked ? "text-white fill-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-medium">{ad.impressions || 0}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={handleSave}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "p-3 rounded-full backdrop-blur-sm transition-colors",
            saved ? "bg-primary" : "bg-black/40"
          )}>
            <Bookmark className={cn("h-6 w-6", saved ? "text-white fill-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-medium">{ad.saves || 0}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={handleContact}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 rounded-full bg-green-500 backdrop-blur-sm">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Call</span>
        </motion.button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-16 p-4 z-10">
        {/* Offer Tag */}
        {ad.offer_text && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <Badge variant="destructive" className="bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-sm px-3 py-1">
              🔥 {ad.offer_text}
            </Badge>
          </motion.div>
        )}

        {/* Title & Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1 line-clamp-2">
                {ad.title}
              </h2>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{location}, {city}</span>
                <BadgeCheck className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl md:text-3xl font-bold text-white">
                {formatPrice(price)}
              </p>
              {ad.ad_type === 'property' && (
                <p className="text-white/70 text-sm">onwards</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Property Details */}
        {ad.properties && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mt-3 text-white/90"
          >
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span className="text-sm">{ad.properties.bhk} BHK</span>
            </div>
            {ad.properties.area && (
              <div className="flex items-center gap-1">
                <Maximize className="h-4 w-4" />
                <span className="text-sm">{ad.properties.area} sq.ft</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Tagline */}
        {ad.tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-sm mt-3 line-clamp-2"
          >
            {ad.tagline}
          </motion.p>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          <Button 
            className="w-full bg-white text-black hover:bg-white/90 font-semibold h-12 text-base"
            onClick={handleContact}
          >
            {ad.cta_text || "Schedule Visit"}
          </Button>
        </motion.div>

        {/* Swipe Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mt-4 text-white/60"
        >
          <ChevronUp className="h-4 w-4 animate-bounce" />
          <span className="text-xs">Swipe up for more</span>
        </motion.div>
      </div>
    </div>
  );
};

export default ReelCard;
