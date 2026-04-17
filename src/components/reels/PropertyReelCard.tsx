import { motion } from "framer-motion";
import { Heart, Share2, Bookmark, MapPin, Building2, Verified, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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
  onViewDetails: () => void;
  onBookVisit: () => void;
}

const extractEmbedUrl = (url: string): string => {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&rel=0&controls=0&playlist=${shortsMatch[1]}`;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&rel=0&controls=0&playlist=${ytMatch[1]}`;

  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return `https://www.instagram.com/p/${igMatch[1]}/embed`;

  return url;
};

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString()}`;
};

export default function PropertyReelCard({ property, isActive, onViewDetails, onBookVisit }: PropertyReelCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoUrl = property.video_urls[0];
  const isDirectVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl);
  const embedUrl = isDirectVideo ? videoUrl : extractEmbedUrl(videoUrl);
  const posterImage = property.images?.[0];

  return (
    <div className="relative w-full h-full bg-black snap-start snap-always">
      {/* Video player */}
      {isActive ? (
        isDirectVideo ? (
          <video
            key={videoUrl}
            src={videoUrl}
            poster={posterImage}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={property.title}
          />
        )
      ) : posterImage ? (
        <img src={posterImage} alt={property.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        {property.verified && (
          <Badge className="bg-emerald-500/90 text-white border-0 gap-1">
            <Verified className="h-3 w-3" /> Verified
          </Badge>
        )}
        <Badge className="bg-black/50 backdrop-blur-sm text-white border-0">
          {property.type || "Apartment"}
        </Badge>
      </div>

      {/* Side action bar */}
      <div className="absolute right-3 bottom-48 flex flex-col gap-4 z-10">
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${liked ? "bg-red-500" : "bg-white/20"}`}>
            <Heart className={`h-5 w-5 ${liked ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-medium">Like</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${saved ? "bg-primary" : "bg-white/20"}`}>
            <Bookmark className={`h-5 w-5 ${saved ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-medium">Save</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.3 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </motion.button>
      </div>

      {/* Bottom property info */}
      <div className="absolute bottom-0 left-0 right-16 p-4 z-10">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <h3 className="text-white font-bold text-xl mb-1 line-clamp-2">{property.title}</h3>
          <div className="flex items-center gap-1 text-white/80 text-sm mb-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>{property.locality}, {property.city}</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white font-bold text-lg">{formatPrice(property.price)}</span>
            {property.bhk && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {property.bhk} BHK
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30"
              onClick={onViewDetails}
            >
              <Eye className="h-4 w-4 mr-1" /> Details
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              onClick={onBookVisit}
            >
              Book Visit
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
