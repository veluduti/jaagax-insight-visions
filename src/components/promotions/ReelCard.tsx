import { useState, useCallback } from "react";
import { Heart, Bookmark, Share2, MapPin, Sparkles, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  highlights: any;
  property_id?: string | null;
  project_id?: string | null;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number; area?: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

interface ReelCardProps {
  ad: Advertisement;
  isActive: boolean;
  isSaved: boolean;
  onSave: () => void;
  onNavigate?: () => void;
  index: number;
}

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString()}`;
};

const ReelCard = ({ ad, isActive, isSaved, onSave, onNavigate, index }: ReelCardProps) => {
  const [showHeart, setShowHeart] = useState(false);
  const [liked, setLiked] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const images = ad.images?.length ? ad.images : [
    ""
  ];

  const price = ad.properties?.price || ad.projects?.avg_price || 0;
  const location = ad.properties?.locality || ad.projects?.locality || '';
  const city = ad.properties?.city || ad.projects?.city || '';
  const hasDetailPage = !!(ad.property_id || ad.project_id);

  // Double-tap to like
  const lastTap = useCallback(() => {
    let lastTapTime = 0;
    return () => {
      const now = Date.now();
      if (now - lastTapTime < 300) {
        setLiked(true);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
        toast.success("Added to favorites!");
      }
      lastTapTime = now;
    };
  }, [])();

  // Cycle through images on left/right tap
  const handleImageTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third && imageIndex > 0) {
      setImageIndex((i) => i - 1);
    } else if (x > third * 2 && imageIndex < images.length - 1) {
      setImageIndex((i) => i + 1);
    } else {
      lastTap();
    }
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Image with multi-image support */}
      <div className="absolute inset-0" onClick={handleImageTap}>
        <AnimatePresence mode="wait">
          <motion.img
            key={imageIndex}
            src={images[imageIndex]}
            alt={ad.title}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
      </div>

      {/* Image indicators */}
      {images.length > 1 && (
        <div className="absolute top-20 left-0 right-0 z-10 flex gap-1 px-16 justify-center">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-all duration-300 ${
                i === imageIndex ? "bg-white w-6" : "bg-white/40 w-3"
              }`}
            />
          ))}
        </div>
      )}

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <Heart className="h-24 w-24 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

      {/* Top Left Badges */}
      <div className="absolute top-12 left-4 z-10 flex flex-col gap-2">
        {ad.featured && (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-lg">
            <Sparkles className="h-3 w-3" />
            Featured
          </Badge>
        )}
        {ad.ad_type && ad.ad_type !== "standard" && (
          <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0">
            {ad.ad_type}
          </Badge>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-48 flex flex-col items-center gap-5 z-20">
        <button
          className="flex flex-col items-center gap-1"
          onClick={() => {
            setLiked(!liked);
            toast.success(liked ? "Removed from favorites" : "Added to favorites!");
          }}
        >
          <div className={`p-3 rounded-full backdrop-blur-sm transition-colors ${liked ? "bg-red-500/80" : "bg-black/40"}`}>
            <Heart className={`h-6 w-6 ${liked ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-medium">{(ad.impressions || 0) + (liked ? 1 : 0)}</span>
        </button>

        <button className="flex flex-col items-center gap-1" onClick={onSave}>
          <div className={`p-3 rounded-full backdrop-blur-sm transition-colors ${isSaved ? "bg-primary" : "bg-black/40"}`}>
            <Bookmark className={`h-6 w-6 ${isSaved ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-medium">{ad.saves || 0}</span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onClick={() => {
            navigator.share?.({ title: ad.title, url: window.location.href })
              .catch(() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied!");
              });
          }}
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-lg">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        {/* View Detail button */}
        {hasDetailPage && (
          <button className="flex flex-col items-center gap-1" onClick={onNavigate}>
            <motion.div
              className="p-3 rounded-full bg-primary/80 backdrop-blur-sm shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Eye className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-white text-xs font-medium">View</span>
          </button>
        )}
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-20 p-4 z-10">
        {/* Offer Tag */}
        {ad.offer_text && (
          <Badge variant="destructive" className="bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-sm px-3 py-1 shadow-lg mb-3">
            🔥 {ad.offer_text}
          </Badge>
        )}

        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1 line-clamp-2 drop-shadow-lg">
              {ad.title}
            </h2>
            {(location || city) && (
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{location}{city ? `, ${city}` : ''}</span>
              </div>
            )}
            {ad.tagline && (
              <p className="text-white/70 text-sm mt-1 line-clamp-1">{ad.tagline}</p>
            )}
          </div>
          {price > 0 && (
            <div className="text-right">
              <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                {formatPrice(price)}
              </p>
            </div>
          )}
        </div>

        {/* CTA Button - navigates to detail page */}
        <div className="mt-4">
          <Button
            className="w-full bg-white text-black hover:bg-white/90 font-semibold h-12 text-base shadow-xl gap-2"
            onClick={onNavigate}
          >
            {hasDetailPage && <ExternalLink className="h-4 w-4" />}
            {ad.cta_text || (hasDetailPage ? "View Full Details" : "Schedule Visit")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
