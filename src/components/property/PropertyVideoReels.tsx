import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertyVideoReelsProps {
  videoUrls: string[];
  propertyTitle: string;
}

const extractVideoId = (url: string): { type: "youtube" | "instagram" | "unknown"; id: string; embedUrl: string } => {
  // YouTube Shorts: https://youtube.com/shorts/ID or https://www.youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    return { type: "youtube", id: shortsMatch[1], embedUrl: `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0` };
  }

  // Standard YouTube: https://www.youtube.com/watch?v=ID or https://youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return { type: "youtube", id: ytMatch[1], embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }

  // Instagram Reels: https://www.instagram.com/reel/ID/ or /p/ID/
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    return { type: "instagram", id: igMatch[1], embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed` };
  }

  return { type: "unknown", id: "", embedUrl: url };
};

export default function PropertyVideoReels({ videoUrls, propertyTitle }: PropertyVideoReelsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!videoUrls || videoUrls.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Property Reels
        </h3>
        <Badge variant="secondary">{videoUrls.length} video{videoUrls.length > 1 ? "s" : ""}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {videoUrls.map((url, idx) => {
          const video = extractVideoId(url);
          const isActive = activeIndex === idx;

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-border cursor-pointer group"
              onClick={() => setActiveIndex(isActive ? null : idx)}
            >
              {isActive ? (
                <iframe
                  src={video.embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={`${propertyTitle} - Video ${idx + 1}`}
                />
              ) : (
                <>
                  {video.type === "youtube" ? (
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                      alt={`Video thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                     loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-7 w-7 text-black ml-1" />
                    </div>
                  </div>
                  <Badge className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white border-0 text-xs">
                    {video.type === "youtube" ? "YouTube" : video.type === "instagram" ? "Instagram" : "Video"}
                  </Badge>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
