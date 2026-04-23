import { motion } from "framer-motion";
import { Heart, Share2, Bookmark, MapPin, Building2, Verified } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";

interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  bhk: number | null;
  type: string | null;
  verified: boolean | null;
  video_urls: string[];
  images: string[] | null;
}

interface PropertyReelCardProps {
  property: Property;
  isActive: boolean;
  onVisit: () => void;
}

const extractEmbedUrl = (url: string, active: boolean): string => {
  const autoplay = active ? 1 : 0;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=${autoplay}&mute=1&loop=1&rel=0&controls=0&modestbranding=1&playsinline=1&playlist=${shortsMatch[1]}`;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${autoplay}&mute=1&loop=1&rel=0&controls=0&modestbranding=1&playsinline=1&playlist=${ytMatch[1]}`;

  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return `https://www.instagram.com/p/${igMatch[1]}/embed`;

  return url;
};

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString()}`;
};

export default function PropertyReelCard({ property, isActive, onVisit }: PropertyReelCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = property.video_urls[0];
  const isDirectVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl);
  const embedUrl = isDirectVideo ? videoUrl : extractEmbedUrl(videoUrl, isActive);
  const posterImage = property.images?.[0];

  // Pause native video when not active
  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isDirectVideo]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video player */}
      {isDirectVideo ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterImage}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay={isActive}
          loop
          muted
          playsInline
        />
      ) : isActive ? (
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          title={property.title}
        />
      ) : posterImage ? (
        <img src={posterImage} alt={property.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Bottom gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      {/* Top subtle gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        {property.verified && (
          <Badge className="bg-emerald-500/90 text-white border-0 gap-1">
            <Verified className="h-3 w-3" /> Verified
          </Badge>
        )}
        {property.type && (
          <Badge className="bg-black/50 backdrop-blur-sm text-white border-0">
            {property.type}
          </Badge>
        )}
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-5 z-10">
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1"
          aria-label="Like"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${liked ? "bg-red-500" : "bg-white/15"}`}>
            <Heart className={`h-5 w-5 ${liked ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-[11px] font-medium">Like</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-1"
          aria-label="Save"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${saved ? "bg-primary" : "bg-white/15"}`}>
            <Bookmark className={`h-5 w-5 ${saved ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-[11px] font-medium">Save</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: property.title, url: `${window.location.origin}/property/${property.id}` }).catch(() => {});
            } else {
              navigator.clipboard.writeText(`${window.location.origin}/property/${property.id}`);
            }
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">Share</span>
        </motion.button>
      </div>

      {/* Bottom property info + CTA */}
      <div className="absolute bottom-0 left-0 right-16 p-4 z-10">
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">{property.title}</h3>
          <div className="flex items-center gap-1 text-white/80 text-xs mb-2">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{property.locality}, {property.city}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white font-bold text-base">{formatPrice(property.price)}</span>
            {property.bhk && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {property.bhk} BHK
              </Badge>
            )}
          </div>
          <Button
            size="lg"
            onClick={onVisit}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
          >
            Visit
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
