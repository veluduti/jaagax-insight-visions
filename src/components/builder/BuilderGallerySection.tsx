import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  videos: string[];
  tier?: string;
}

const tierCard = {
  luxury: "bg-[#0f1510]/80 backdrop-blur-md border border-[#2a3a20]/40 rounded-2xl",
  standard: "bg-white/80 dark:bg-[#141a12]/60 backdrop-blur-md border border-[#d4e0d0] dark:border-[#1e2e1a]/50 rounded-2xl",
  budget: "bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-blue-800/30 rounded-2xl",
};

const BuilderGallerySection = ({ images, videos, tier = "standard" }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = images?.filter(Boolean) || [];
  if (allImages.length === 0 && (!videos || videos.length === 0)) return null;

  const card = tierCard[tier as keyof typeof tierCard] || tierCard.standard;

  return (
    <>
      <div className={cn("p-6", card)}>
        {/* Image Grid */}
        {allImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
            {allImages.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
              >
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
              </div>
            ))}
          </div>
        )}

        {/* Videos */}
        {videos?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Play className="h-4 w-4" /> Videos
            </h3>
            <div className="flex flex-wrap gap-2">
              {videos.map((v, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs rounded-xl" onClick={() => window.open(v, "_blank")}>
                  <Play className="h-3 w-3 mr-1" /> Video {i + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur-xl border-0 rounded-2xl overflow-hidden">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain" />
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 rounded-xl bg-black/30 hover:bg-black/50 text-white" onClick={() => setLightboxOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/30 hover:bg-black/50 text-white"
                  onClick={() => setLightboxIndex((p) => (p - 1 + allImages.length) % allImages.length)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/30 hover:bg-black/50 text-white"
                  onClick={() => setLightboxIndex((p) => (p + 1) % allImages.length)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/40 backdrop-blur-sm px-3.5 py-1.5 rounded-full">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuilderGallerySection;
