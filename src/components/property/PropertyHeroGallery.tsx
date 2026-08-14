import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Maximize2, Play, Sparkles, Clock, X, ImageIcon,
} from "lucide-react";

interface PropertyHeroGalleryProps {
  images: string[];
  videos?: string[];
  propertyTitle: string;
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:shorts\/|(?:[^/]+\/.+\/)|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  return m ? m[1] : null;
}

const MAX_THUMBS = 6;

export default function PropertyHeroGallery({
  images = [],
  videos = [],
  propertyTitle,
}: PropertyHeroGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const total = images.length;
  const hasImages = total > 0;
  const videoUrl = videos?.[0];
  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;

  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1)), [total]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  if (!hasImages && !videoUrl) return null;

  const thumbs = images.slice(0, MAX_THUMBS);
  const extra = Math.max(total - MAX_THUMBS, 0);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main gallery */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted group"
          >
            {hasImages ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={index}
                  src={images[index]}
                  alt={`${propertyTitle} — photo ${index + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setLightbox(true)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              </AnimatePresence>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-60" />
                <span className="text-xs">Photos coming soon</span>
              </div>
            )}

            {hasImages && (
              <>
                <span className="absolute bottom-4 left-4 rounded-md bg-background/85 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                  {index + 1} / {total}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setLightbox(true)}
                  className="absolute bottom-4 right-4 gap-2 backdrop-blur-sm"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              </>
            )}

            {total > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={prev}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={next}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </motion.div>

          {/* Thumbnails */}
          {total > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {thumbs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  onDoubleClick={() => setLightbox(true)}
                  aria-label={`View photo ${i + 1}`}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all ${
                    i === index ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`${propertyTitle} thumbnail ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
              {extra > 0 && (
                <button
                  onClick={() => { setIndex(MAX_THUMBS); setLightbox(true); }}
                  className="flex aspect-[4/3] items-center justify-center rounded-lg bg-foreground/80 text-sm font-semibold text-background"
                >
                  +{extra}
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI property video card */}
        <div
          role={videoUrl ? "button" : undefined}
          onClick={() => videoUrl && setVideoOpen(true)}
          className={`relative min-h-[260px] overflow-hidden rounded-2xl bg-foreground/90 ${videoUrl ? "cursor-pointer" : ""}`}
        >
          {images[0] && (
            <img
              src={images[0]}
              alt={`${propertyTitle} video preview`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/60 to-foreground/20" />

          <div className="relative flex h-full flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/15 px-2.5 py-1 text-xs font-medium text-background backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> AI Generated
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" /> {videoUrl ? "Watch now" : "Coming soon"}
              </span>
            </div>

            <div className="flex flex-1 items-center justify-center py-6">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-background/90 ${videoUrl ? "bg-background/15" : "bg-background/5"} backdrop-blur-sm`}>
                <Play className="ml-1 h-7 w-7 fill-background text-background" />
              </div>
            </div>

            <div className="text-background">
              <h3 className="text-xl font-bold leading-tight">Property Video</h3>
              <p className="text-sm text-background/80">
                {videoUrl ? "AI-generated overview of this property" : "An AI overview of this property will appear here"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-6xl border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          <div className="relative">
            <img
              src={images[index]}
              alt={`${propertyTitle} — photo ${index + 1}`}
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setLightbox(false)}
              aria-label="Close"
              className="absolute right-3 top-3"
            >
              <X className="h-5 w-5" />
            </Button>
            {total > 1 && (
              <>
                <Button size="icon" variant="secondary" onClick={prev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="secondary" onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-background/85 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {index + 1} / {total}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video popup */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-4xl border-0 bg-background p-2">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                title={`${propertyTitle} video`}
                className="h-full w-full"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : videoUrl ? (
              <video src={videoUrl} controls autoPlay className="h-full w-full object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
